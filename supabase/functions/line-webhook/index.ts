/**
 * LINE Webhook Edge Function (Deno)
 *
 * 必要な Supabase Secrets（supabase secrets set で登録）:
 *   LINE_CHANNEL_SECRET      - LINE Messaging API チャンネルシークレット
 *   LINE_CHANNEL_ACCESS_TOKEN - LINE Messaging API チャンネルアクセストークン
 *   FRONTEND_URL             - フロントエンドのベース URL（例: https://your-app.vercel.app）
 *
 * LINE Developers コンソールでの設定:
 *   Webhook URL: https://<project-ref>.supabase.co/functions/v1/line-webhook
 *   Use webhook: ON
 *   Auto-reply messages: OFF
 *
 * デプロイ:
 *   supabase functions deploy line-webhook --no-verify-jwt
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LINE_REPLY_API = 'https://api.line.me/v2/bot/message/reply';

/** x-line-signature ヘッダーの HMAC-SHA256 署名を検証する */
async function verifySignature(
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return expected === signature;
}

/** LINE Reply メッセージを送信する */
async function replyMessage(
  replyToken: string,
  text: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(LINE_REPLY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  });
  if (!res.ok) {
    console.error('[line-webhook] reply error:', res.status, await res.text());
  }
}

serve(async (req: Request) => {
  const channelSecret = Deno.env.get('LINE_CHANNEL_SECRET') ?? '';
  const accessToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? '';
  const frontendUrl = Deno.env.get('FRONTEND_URL') ?? '';

  const body = await req.text();
  const signature = req.headers.get('x-line-signature') ?? '';

  // 署名検証: 不正な場合は 400 を返して中断
  const isValid = await verifySignature(body, signature, channelSecret);
  if (!isValid) {
    return new Response('Invalid signature', { status: 400 });
  }

  // SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY は Edge Function に自動注入される
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  let payload: { events?: LineEvent[] };
  try {
    payload = JSON.parse(body);
  } catch {
    // パース失敗でも LINE には 200 を返す（LINE が再送しないようにするため）
    return new Response('OK', { status: 200 });
  }

  for (const event of payload.events ?? []) {
    // テキストメッセージかつ「申込」を含む場合のみ申込を生成
    if (
      event.type === 'message' &&
      event.message?.type === 'text' &&
      event.message.text.includes('申込')
    ) {
      const lineUserId: string = event.source.userId;

      const { data, error } = await supabase
        .from('applications')
        .insert({
          line_user_id: lineUserId,
          state: 'S01',
          email: '',
          phone: '',
          birth_date: '2000-01-01',
          desired_amount: 0,
          product_name: '',
          credit_limit: 0,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[line-webhook] insert error:', error.message);
        continue;
      }

      const applyUrl = `${frontendUrl}/apply/${data.id}`;

      await replyMessage(
        event.replyToken,
        `お申込ありがとうございます。\n以下の URL からお申込手続きをお進みください。\n\n${applyUrl}`,
        accessToken,
      );
    }
  }

  // LINE プラットフォームの仕様: Webhook エンドポイントは常に 200 を返す
  return new Response('OK', { status: 200 });
});

// ---- 型定義 ----

interface LineEvent {
  type: string;
  replyToken: string;
  source: { userId: string };
  message?: {
    type: string;
    text: string;
  };
}
