import { useEffect, useRef } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, Clock } from 'lucide-react';

/** PoC デモ用ポーリング間隔（ms）。本番では 30_000 に変更する。 */
const POLL_INTERVAL_MS = 5_000;

/** S05: 審査中待機。DB の state を定期ポーリングし S06/S99 になったら自動遷移する。 */
export function WaitingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;

    const poll = async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('state')
        .eq('id', id)
        .single();

      if (error) {
        console.error('[WaitingPage] poll error:', error.message);
        return;
      }

      if (data?.state === 'S06') {
        if (timerRef.current) clearInterval(timerRef.current);
        navigate(`/apply/${id}/contract`, { replace: true });
      } else if (data?.state === 'S99') {
        if (timerRef.current) clearInterval(timerRef.current);
        navigate(`/apply/${id}/rejected`, { replace: true });
      }
    };

    // 即時1回実行してからインターバル開始
    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id, navigate]);

  if (!id) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-gray-100 py-8 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Clock className="w-16 h-16 text-blue-400" />
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              </div>
            </div>
          </div>

          <h1 className="text-xl font-bold text-gray-800 mb-3">審査中</h1>
          <p className="text-gray-600 mb-6">
            現在、お申込内容の審査を行っております。
            <br />
            審査が完了次第、自動的に次のステップへ進みます。
          </p>

          <div className="p-4 bg-gray-50 rounded-lg text-left space-y-2">
            <p className="text-xs text-gray-500 font-medium">審査の流れ</p>
            <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li>提出書類の内容確認</li>
              <li>在籍確認（必要な場合）</li>
              <li>総合審査</li>
            </ul>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            このページはそのままにしてお待ちください（自動で更新されます）
          </p>
          <p className="text-xs text-yellow-600 mt-2">
            ▼ PoC デモ: 管理画面から状態を S06 に更新すると自動遷移します
          </p>
        </div>
      </div>
    </div>
  );
}
