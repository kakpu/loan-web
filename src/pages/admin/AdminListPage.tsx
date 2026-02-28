import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Application, ApplicationState, STATE_LABELS } from '../../types';
import { LogOut, RefreshCw, ChevronRight, Loader2 } from 'lucide-react';

const STATE_BADGE: Record<ApplicationState, string> = {
  S01: 'bg-gray-100 text-gray-700',
  S02: 'bg-gray-100 text-gray-700',
  S03: 'bg-blue-100 text-blue-700',
  S04: 'bg-purple-100 text-purple-700',
  S05: 'bg-yellow-100 text-yellow-800',
  S06: 'bg-indigo-100 text-indigo-700',
  S07: 'bg-green-100 text-green-700',
  S99: 'bg-red-100 text-red-700',
};

/** /admin: 申込一覧。状態フィルタ付き。 */
export function AdminListPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [stateFilter, setStateFilter] = useState<ApplicationState | 'ALL'>('ALL');

  const loadApplications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (stateFilter !== 'ALL') {
        query = query.eq('state', stateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setApplications(data || []);
    } catch (err) {
      console.error('[AdminListPage]', err instanceof Error ? err.message : 'unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateFilter]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-800">管理者画面</span>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
        >
          <LogOut className="w-4 h-4" />
          ログアウト
        </button>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-xl font-bold text-gray-800">申込一覧</h1>
            <div className="flex items-center gap-3">
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value as ApplicationState | 'ALL')}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">全件</option>
                {(Object.entries(STATE_LABELS) as [ApplicationState, string][]).map(([key, label]) => (
                  <option key={key} value={key}>
                    {key}: {label}
                  </option>
                ))}
              </select>
              <button
                onClick={loadApplications}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">申込番号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">状態</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">商品</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">希望額</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">与信枠</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">申込日時</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/admin/applications/${app.id}`)}
                  >
                    <td className="px-4 py-3 text-sm font-mono">{app.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${STATE_BADGE[app.state as ApplicationState]}`}
                      >
                        {STATE_LABELS[app.state as ApplicationState]}
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
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loading && (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            )}
            {!loading && applications.length === 0 && (
              <div className="p-12 text-center text-gray-500">申込データがありません</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
