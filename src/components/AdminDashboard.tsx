import { useState, useEffect } from 'react';
import { Application, STATE_LABELS } from '../types';
import { supabase } from '../lib/supabase';
import { dummyAntisocialCheck } from '../lib/dummyApis';
import { RefreshCw, Eye, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { DUMMY_CONTRACT_URL } from '../config';

export function AdminDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const [reviewForm, setReviewForm] = useState({
    identity_verified: false,
    employment_verified: false,
    decision: 'approved' as 'approved' | 'rejected',
    reviewer_note: '',
  });

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (app: Application) => {
    setSelectedApp(app);
    setReviewForm({
      identity_verified: false,
      employment_verified: false,
      decision: 'approved',
      reviewer_note: '',
    });
  };

  const handleSubmitReview = async () => {
    if (!selectedApp) return;

    setReviewing(true);
    try {
      const antisocialResult = await dummyAntisocialCheck();

      let finalDecision = reviewForm.decision;
      let note = reviewForm.reviewer_note;

      if (!antisocialResult.passed) {
        finalDecision = 'rejected';
        note += ' [反社チェックNG]';
      }

      await supabase.from('review_results').insert({
        application_id: selectedApp.id,
        identity_verified: reviewForm.identity_verified,
        employment_verified: reviewForm.employment_verified,
        decision: finalDecision,
        reviewer_note: note,
      });

      const newState = finalDecision === 'approved' ? 'S06' : 'S99';

      await supabase
        .from('applications')
        .update({ state: newState })
        .eq('id', selectedApp.id);

      await supabase.from('state_transitions').insert({
        application_id: selectedApp.id,
        from_state: selectedApp.state,
        to_state: newState,
        reason: finalDecision === 'approved' ? '審査承認' : '審査否決',
      });

      if (finalDecision === 'approved') {
        await supabase.from('contracts').insert({
          application_id: selectedApp.id,
          contract_url: DUMMY_CONTRACT_URL,
        });
      }

      alert(
        finalDecision === 'approved'
          ? '審査承認しました。契約可状態に移行しました。'
          : '審査否決しました。'
      );

      setSelectedApp(null);
      loadApplications();
    } catch (err) {
      console.error('Failed to submit review:', err);
      alert('審査処理中にエラーが発生しました');
    } finally {
      setReviewing(false);
    }
  };

  const handleForceTimeout = async (app: Application) => {
    if (!confirm(`申込 ${app.id.slice(0, 8)} を強制的にタイムアウト（S99）にしますか？`))
      return;

    try {
      await supabase.from('applications').update({ state: 'S99' }).eq('id', app.id);

      await supabase.from('state_transitions').insert({
        application_id: app.id,
        from_state: app.state,
        to_state: 'S99',
        reason: '強制タイムアウト（デモ用）',
      });

      alert('タイムアウト処理を実行しました');
      loadApplications();
    } catch (err) {
      console.error('Failed to timeout:', err);
      alert('処理中にエラーが発生しました');
    }
  };

  if (selectedApp) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">申込詳細</h2>
            <button
              onClick={() => setSelectedApp(null)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              戻る
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
              <div>
                <p className="text-xs text-gray-600 mb-1">申込番号</p>
                <p className="font-mono text-sm">{selectedApp.id.slice(0, 8)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">状態</p>
                <p className="font-semibold text-sm">{STATE_LABELS[selectedApp.state]}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">メールアドレス</p>
                <p className="text-sm">{selectedApp.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">電話番号</p>
                <p className="text-sm">{selectedApp.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">生年月日</p>
                <p className="text-sm">{selectedApp.birth_date}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">商品名</p>
                <p className="text-sm">{selectedApp.product_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">希望金額</p>
                <p className="text-sm font-semibold">
                  {selectedApp.desired_amount.toLocaleString()}円
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">与信枠</p>
                <p className="text-sm font-semibold">
                  {selectedApp.credit_limit.toLocaleString()}円
                </p>
              </div>
            </div>
          </div>

          {selectedApp.state === 'S05' && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">審査入力</h3>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="identity"
                    checked={reviewForm.identity_verified}
                    onChange={(e) =>
                      setReviewForm({ ...reviewForm, identity_verified: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <label htmlFor="identity" className="text-sm text-gray-700">
                    本人確認補完 OK
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="employment"
                    checked={reviewForm.employment_verified}
                    onChange={(e) =>
                      setReviewForm({ ...reviewForm, employment_verified: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <label htmlFor="employment" className="text-sm text-gray-700">
                    在籍確認 OK
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    審査結果
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="decision"
                        value="approved"
                        checked={reviewForm.decision === 'approved'}
                        onChange={() =>
                          setReviewForm({ ...reviewForm, decision: 'approved' })
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm">可決</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="decision"
                        value="rejected"
                        checked={reviewForm.decision === 'rejected'}
                        onChange={() =>
                          setReviewForm({ ...reviewForm, decision: 'rejected' })
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm">否決</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    審査メモ
                  </label>
                  <textarea
                    value={reviewForm.reviewer_note}
                    onChange={(e) =>
                      setReviewForm({ ...reviewForm, reviewer_note: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                <button
                  onClick={handleSubmitReview}
                  disabled={reviewing}
                  className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
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

          {selectedApp.state !== 'S05' && selectedApp.state !== 'S99' && (
            <div className="text-center text-sm text-gray-500">
              審査入力は S05（審査中）状態でのみ可能です
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">申込管理</h1>
            <button
              onClick={loadApplications}
              disabled={loading}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              更新
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  申込番号
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">状態</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">商品</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  希望額
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  与信枠
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  申込日時
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{app.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${
                        app.state === 'S99'
                          ? 'bg-red-100 text-red-700'
                          : app.state === 'S07'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {app.state === 'S99' ? (
                        <XCircle className="w-3 h-3" />
                      ) : app.state === 'S07' ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : null}
                      {STATE_LABELS[app.state]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{app.product_name}</td>
                  <td className="px-4 py-3 text-sm">{app.desired_amount.toLocaleString()}円</td>
                  <td className="px-4 py-3 text-sm font-semibold">
                    {app.credit_limit.toLocaleString()}円
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(app.created_at).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(app)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="詳細を見る"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      {app.state === 'S04' && (
                        <button
                          onClick={() => handleForceTimeout(app)}
                          className="px-2 py-1 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 rounded"
                          title="タイムアウト"
                        >
                          T/O
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {applications.length === 0 && !loading && (
            <div className="p-12 text-center text-gray-500">
              申込データがありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
