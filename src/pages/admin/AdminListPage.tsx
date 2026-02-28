import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AdminDashboard } from '../../components/AdminDashboard';
import { LogOut } from 'lucide-react';

/** /admin: 申込一覧。Issue #5 で AdminDashboard を分割・リファクタリング予定。 */
export function AdminListPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

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
      <AdminDashboard />
    </div>
  );
}
