import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/** 未認証または admin ロール以外のユーザーを /admin/login へリダイレクトするガード。 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user || role !== 'admin') return <Navigate to="/admin/login" replace />;

  return <>{children}</>;
}
