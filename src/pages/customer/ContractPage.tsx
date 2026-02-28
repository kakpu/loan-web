import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { dummyPayPayPayment } from '../../lib/dummyApis';
import { DUMMY_CONTRACT_URL } from '../../config';
import { Application } from '../../types';
import { Loader2, FileCheck, ExternalLink } from 'lucide-react';
import { ErrorBanner } from '../../components/ui/ErrorBanner';

/** S06: 契約書確認・署名。同意後に PayPay ダミー決済を実行して S07 へ遷移。 */
export function ContractPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('applications')
      .select('desired_amount, product_name')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setSubmitError('申込情報の取得に失敗しました。');
        } else {
          setApp(data as Application);
        }
        setLoading(false);
      });
  }, [id]);

  const handleSign = async () => {
    if (!id || !app) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // PoC: PayPay ダミー決済
      const payment = await dummyPayPayPayment(app.desired_amount);
      if (!payment.success) throw new Error('payment failed');

      const { error: updateError } = await supabase
        .from('applications')
        .update({ state: 'S07' })
        .eq('id', id);
      if (updateError) throw updateError;

      await supabase.from('state_transitions').insert({
        application_id: id,
        from_state: 'S06',
        to_state: 'S07',
        reason: '契約締結・決済完了',
      });

      navigate(`/apply/${id}/complete`);
    } catch (err) {
      setSubmitError('処理中にエラーが発生しました。しばらくしてからお試しください。');
      console.error('[ContractPage]', err instanceof Error ? err.message : 'unknown error');
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
            <FileCheck className="w-8 h-8 text-green-500" />
            <h1 className="text-2xl font-bold text-gray-800">契約書の確認・署名</h1>
          </div>

          <p className="text-gray-600 mb-6">
            以下の契約書をよくご確認のうえ、同意いただける場合は「同意して署名する」ボタンを押してください。
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">借入金額</span>
              <span className="text-lg font-bold text-gray-800">
                {app?.desired_amount?.toLocaleString()}円
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">商品名</span>
              <span className="text-sm font-medium text-gray-800">{app?.product_name}</span>
            </div>
          </div>

          <a
            href={DUMMY_CONTRACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm mb-6 underline"
          >
            <ExternalLink className="w-4 h-4" />
            契約書 PDF を確認する（PoC ダミー）
          </a>

          <label className="flex items-start gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              契約書の内容をすべて確認し、同意します
            </span>
          </label>

          {submitError && <ErrorBanner message={submitError} />}

          <button
            onClick={handleSign}
            disabled={!agreed || submitting}
            className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                処理中...
              </>
            ) : (
              '同意して署名する'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
