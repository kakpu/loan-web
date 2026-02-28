import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TopPage } from './pages/TopPage';
import { ApplyRedirect } from './pages/customer/ApplyRedirect';
import { FormPage } from './pages/customer/FormPage';
import { CreditPage } from './pages/customer/CreditPage';
import { IdentityPage } from './pages/customer/IdentityPage';
import { WaitingPage } from './pages/customer/WaitingPage';
import { ContractPage } from './pages/customer/ContractPage';
import { CompletePage } from './pages/customer/CompletePage';
import { RejectedPage } from './pages/customer/RejectedPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminListPage } from './pages/admin/AdminListPage';
import { AdminDetailPage } from './pages/admin/AdminDetailPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* トップ */}
        <Route path="/" element={<TopPage />} />

        {/* 顧客向け: /apply/:id でstate を読み取り各ページへリダイレクト */}
        <Route path="/apply/:id" element={<ApplyRedirect />} />
        <Route path="/apply/:id/form" element={<FormPage />} />
        <Route path="/apply/:id/credit" element={<CreditPage />} />
        <Route path="/apply/:id/identity" element={<IdentityPage />} />
        <Route path="/apply/:id/waiting" element={<WaitingPage />} />
        <Route path="/apply/:id/contract" element={<ContractPage />} />
        <Route path="/apply/:id/complete" element={<CompletePage />} />
        <Route path="/apply/:id/rejected" element={<RejectedPage />} />

        {/* 管理者向け */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/applications/:id"
          element={
            <ProtectedRoute>
              <AdminDetailPage />
            </ProtectedRoute>
          }
        />

        {/* 未定義パス → トップへ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
