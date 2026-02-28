import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Application } from '../../types';
import { Loader2, CheckCircle } from 'lucide-react';

/** S03: 即時与信結果・希望額確認。与信通過時のみ表示される。 */
export function CreditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setSubmitError('申込情報の取得に失敗しました。');
        } else if (data.state === 'S99') {
          navigate(`/apply/${id}/rejected`, { replace: true });
          return;
        } else {
          setApp(data as Application);
        }
        setLoading(false);
      });
  }, [id, navigate]);

  const handleNext = async () => {
    if (!id) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { error: updateError } = await supabase
        .from('applications')
        .update({ state: 'S04' })
        .eq('id', id);
      if (updateError) throw updateError;

      await supabase.from('state_transitions').insert({
        application_id: id,
        from_state: 'S03',
        to_state: 'S04',
        reason: '与信確認・本人確認へ進む',
      });

      navigate(`/apply/${id}/identity`);
    } catch (err) {
      setSubmitError('処理中にエラーが発生しました。しばらくしてからお試しください。');
      console.error('[CreditPage]', err instanceof Error ? err.message : 'unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!id) return <Navigate to="/" replace />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <h1 className="text-2xl font-bold text-gray-800">仮与信 通過</h1>
          </div>

          <p className="text-gray-600 mb-6">
            お申込内容の審査が完了しました。以下の条件でご融資が可能です。
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">ご希望金額</span>
              <span className="text-lg font-semibold text-gray-800">
                {app?.desired_amount?.toLocaleString()}円
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-blue-200 pt-3">
              <span className="text-sm text-gray-600">仮与信限度額</span>
              <span className="text-xl font-bold text-blue-700">
                {app?.credit_limit?.toLocaleString()}円
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">商品名</span>
              <span className="text-sm font-medium text-gray-800">{app?.product_name}</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-6">
            ※ 本与信結果は仮のものです。本審査の結果によって変更になる場合があります。
          </p>

          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm mb-4">
              {submitError}
            </div>
          )}

          <button
            onClick={handleNext}
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                処理中...
              </>
            ) : (
              '次へ進む（本人確認へ）'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
