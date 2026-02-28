import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { dummyEkyc, dummyAntisocialCheck } from '../../lib/dummyApis';
import { Loader2, ShieldCheck, FileText } from 'lucide-react';

/** S04: 本人確認案内。eKYC + 反社チェック（PoC ダミー）を実行して S05 または S99 へ遷移。 */
export function IdentityPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!id) return;
    setUploading(true);
    setSubmitError(null);
    try {
      // eKYC と反社チェックを並列実行（PoC ダミー API）
      const [ekycResult, antisocialResult] = await Promise.all([
        dummyEkyc(),
        dummyAntisocialCheck(),
      ]);

      const passed = ekycResult.success && antisocialResult.passed;
      const newState = passed ? 'S05' : 'S99';

      const { error: updateError } = await supabase
        .from('applications')
        .update({ state: newState })
        .eq('id', id);
      if (updateError) throw updateError;

      await supabase.from('state_transitions').insert({
        application_id: id,
        from_state: 'S04',
        to_state: newState,
        reason: passed ? '本人確認・反社チェック通過' : '本人確認または反社チェック否決',
      });

      navigate(`/apply/${id}/${passed ? 'waiting' : 'rejected'}`);
    } catch (err) {
      setSubmitError('処理中にエラーが発生しました。しばらくしてからお試しください。');
      console.error('[IdentityPage]', err instanceof Error ? err.message : 'unknown error');
    } finally {
      setUploading(false);
    }
  };

  if (!id) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-800">本人確認</h1>
          </div>

          <p className="text-gray-600 mb-6">
            ご融資手続きを進めるにあたり、本人確認書類のご提出が必要です。
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <FileText className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">受付可能な書類</p>
                <ul className="text-sm text-gray-600 mt-1 space-y-1 list-disc list-inside">
                  <li>運転免許証（両面）</li>
                  <li>マイナンバーカード（表面のみ）</li>
                  <li>パスポート（顔写真ページ）</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700">
                ▼ PoC デモ：実際のファイルアップロードは未実装です。ボタン押下で eKYC・反社チェックのダミー処理を実行します。
              </p>
            </div>
          </div>

          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm mb-4">
              {submitError}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                確認処理中...
              </>
            ) : (
              '書類をアップロードする（PoC ダミー）'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
