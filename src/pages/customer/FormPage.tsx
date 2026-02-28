import { useParams, Navigate } from 'react-router-dom';
import { ApplicationForm } from '../../components/ApplicationForm';

/** S01〜S02: 申込フォーム。Issue #3 では状態別ページ分割の一部として再整理予定。 */
export function FormPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <ApplicationForm applicationId={id} />
      </div>
    </div>
  );
}
