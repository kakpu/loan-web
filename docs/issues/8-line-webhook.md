### 背景 / 目的
要件定義（`01_requirements.md`）では LINE Webhook 起点の申込フローが必須。現在は LINE 連携が未実装で `line_user_id` がデモ用のダミー文字列になっている。Supabase Edge Function で LINE Webhook を実装し、顧客が「申込」と送信すると申込 URL が返るフローを確立する。

- 依存: #1
- ラベル: backend

### スコープ / 作業項目
- `supabase/functions/line-webhook/index.ts` の新規作成（Deno）
- `x-line-signature` による署名検証の実装
- 「申込」キーワード受信時の申込エンティティ生成（S01）と URL 返信
- LINE Messaging API への Reply メッセージ送信
- `LINE_CHANNEL_SECRET` と `LINE_CHANNEL_ACCESS_TOKEN` を Supabase Secrets で管理
- LINE Developers コンソールへの Webhook URL 登録手順のコメント記載

### ゴール / 完了条件（Acceptance Criteria）
- [ ] `supabase/functions/line-webhook/index.ts` が存在し、Deno で実装されている
- [ ] `x-line-signature` ヘッダーが不正な場合に HTTP 400 を返し、処理を中断する
- [ ] 「申込」を含むテキストメッセージを受信すると `applications` テーブルに INSERT し（`state = 'S01'`）、申込 URL（`{FRONTEND_URL}/apply/{id}`）を LINE に返信する
- [ ] Webhook エンドポイントは LINE プラットフォームの仕様に従い常に HTTP 200 を返す
- [ ] `LINE_CHANNEL_SECRET` と `LINE_CHANNEL_ACCESS_TOKEN` は Supabase Secrets で管理され、コードにハードコードされていない
- [ ] `supabase functions deploy line-webhook` でデプロイが成功する

### テスト観点
- 単体: curl で Webhook エンドポイントを叩き、正しい署名では 200・不正な署名では 400 が返ることを確認
- 統合: LINE Developers の Webhook テスト機能（または ngrok）でエンドツーエンドの動作を確認
- 検証方法: Supabase ダッシュボードで `applications` テーブルに新しいレコードが INSERT されていることを確認

要確認事項:
- LINE Messaging API のチャンネル作成・設定は別途実施が必要（LINE Developers コンソール）
- ローカル開発時の Webhook テストに ngrok を使うか、Supabase 本番環境に直接デプロイするか
