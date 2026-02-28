import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { dummyAntisocialCheck } from '../../lib/dummyApis';
import { DUMMY_CONTRACT_URL } from '../../config';
import { Application, StateTransition, STATE_LABELS } from '../../types';
import { Loader2, ArrowLeft, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

/** /admin/applications/:id: 申込詳細・審査入力・タイムアウト操作 */
export function AdminDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<Application | null>(null);
  const [transitions, setTransitions] = useState<StateTransition[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [timingOut, setTimingOut] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [reviewForm, setReviewForm] = useState({
    identity_verified: false,
    employment_verified: false,
    decision: 'approved' as 'approved' | 'rejected',
    reviewer_note: '',
  });

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [appRes, transRes] = await Promise.all([
        supabase.from('applications').select('*').eq('id', id).single(),
        supabase
          .from('state_transitions')
          .select('*')
          .eq('application_id', id)
          .order('created_at', { ascending: true }),
      ]);
      if (appRes.error) throw appRes.error;
      setApp(appRes.data as Application);
      setTransitions((transRes.data as StateTransition[]) || []);
    } catch (err) {
      setErrorMessage('申込情報の取得に失敗しました。');
      console.error('[AdminDetailPage]', err instanceof Error ? err.message : 'unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmitReview = async () => {
    if (!id || !app) return;
    setReviewing(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const antisocialResult = await dummyAntisocialCheck();
      const finalDecision = antisocialResult.passed ? reviewForm.decision : 'rejected';
      const note = antisocialResult.passed
        ? reviewForm.reviewer_note
        : reviewForm.reviewer_note + ' [反社チェックNG]';

      await supabase.from('review_results').insert({
        application_id: id,
        identity_verified: reviewForm.identity_verified,
        employment_verified: reviewForm.employment_verified,
        decision: finalDecision,
        reviewer_note: note,
      });

      const newState = finalDecision === 'approved' ? 'S06' : 'S99';

      const { error: updateError } = await supabase
        .from('applications')
        .update({ state: newState })
        .eq('id', id);
      if (updateError) throw updateError;

      await supabase.from('state_transitions').insert({
        application_id: id,
        from_state: app.state,
        to_state: newState,
        reason: finalDecision === 'approved' ? '審査承認' : '審査否決',
      });

      if (finalDecision === 'approved') {
        await supabase.from('contracts').insert({
          application_id: id,
          contract_url: DUMMY_CONTRACT_URL,
        });
      }

      setSuccessMessage(
        finalDecision === 'approved'
          ? '審査を承認しました。状態を S06（契約可）に更新しました。'
          : '審査を否決しました。状態を S99（断り確定）に更新しました。'
      );
      await loadData();
    } catch (err) {
      setErrorMessage('審査処理中にエラーが発生しました。しばらくしてからお試しください。');
      console.error('[AdminDetailPage review]', err instanceof Error ? err.message : 'unknown error');
    } finally {
      setReviewing(false);
    }
  };

  const handleForceTimeout = async () => {
    if (!id || !app) return;
    setTimingOut(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const { error: updateError } = await supabase
        .from('applications')
        .update({ state: 'S99' })
        .eq('id', id);
      if (updateError) throw updateError;

      await supabase.from('state_transitions').insert({
        application_id: id,
        from_state: app.state,
        to_state: 'S99',
        reason: '強制タイムアウト（デモ用）',
      });

      setSuccessMessage('タイムアウト処理を実行しました。状態を S99 に更新しました。');
      await loadData();
    } catch (err) {
      setErrorMessage('タイムアウト処理中にエラーが発生しました。');
      console.error('[AdminDetailPage timeout]', err instanceof Error ? err.message : 'unknown error');
    } finally {
      setTimingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">申込が見つかりませんでした。</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          一覧へ戻る
        </button>

        {successMessage && (
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            {errorMessage}
          </div>
        )}

        {/* 申込情報 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">申込情報</h2>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ['申込番号', <span className="font-mono">{app.id.slice(0, 8)}</span>],
                ['現在の状態', <span className="font-semibold">{app.state}: {STATE_LABELS[app.state]}</span>],
                ['メールアドレス', app.email],
                ['電話番号', app.phone],
                ['生年月日', app.birth_date],
                ['商品名', app.product_name],
                ['ご希望金額', app.desired_amount.toLocaleString() + '円'],
                ['仮与信限度額', <span className="font-semibold text-blue-700">{app.credit_limit.toLocaleString()}円</span>],
              ] as [string, React.ReactNode][]
            ).map(([label, value], i) => (
              <div key={i} className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-sm text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 状態遷移ログ */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">状態遷移ログ</h2>
          {transitions.length === 0 ? (
            <p className="text-sm text-gray-500">遷移ログがありません</p>
          ) : (
            <div className="space-y-2">
              {transitions.map((t) => (
                <div key={t.id} className="flex items-baseline gap-3 text-sm">
                  <span className="font-mono text-gray-400 text-xs w-36 flex-shrink-0">
                    {new Date(t.created_at).toLocaleString('ja-JP')}
                  </span>
                  <span className="font-medium text-gray-700 w-24 flex-shrink-0">
                    {t.from_state} → {t.to_state}
                  </span>
                  <span className="text-gray-500">{t.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* S04: タイムアウトボタン */}
        {app.state === 'S04' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-gray-800">タイムアウト操作</h2>
                <p className="text-sm text-gray-500 mt-1">
                  本人確認が期限内に完了しなかった場合に使用します（PoC デモ用）
                </p>
              </div>
            </div>
            <button
              onClick={handleForceTimeout}
              disabled={timingOut}
              className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              {timingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  処理中...
                </>
              ) : (
                '強制タイムアウト（S99）'
              )}
            </button>
          </div>
        )}

        {/* S05: 審査入力フォーム */}
        {app.state === 'S05' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">審査入力</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reviewForm.identity_verified}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, identity_verified: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">本人確認補完 OK</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reviewForm.employment_verified}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, employment_verified: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">在籍確認 OK</span>
              </label>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">審査結果</p>
                <div className="flex gap-6">
                  {(['approved', 'rejected'] as const).map((val) => (
                    <label key={val} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="decision"
                        value={val}
                        checked={reviewForm.decision === val}
                        onChange={() => setReviewForm({ ...reviewForm, decision: val })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{val === 'approved' ? '可決' : '否決'}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">審査メモ</label>
                <textarea
                  value={reviewForm.reviewer_note}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, reviewer_note: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleSubmitReview}
                disabled={reviewing}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {reviewing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    処理中...
                  </>
                ) : (
                  '審査結果を登録'
                )}
              </button>
            </div>
          </div>
        )}

        {/* 審査対象外の状態 */}
        {app.state !== 'S05' && app.state !== 'S04' && (
          <div className="bg-white rounded-lg shadow-sm p-4 text-center text-sm text-gray-500">
            審査入力は S05（審査中）状態でのみ可能です
          </div>
        )}
      </div>
    </div>
  );
}
