import { useParams, Navigate } from 'react-router-dom';
import { CONTACT_URL } from '../../config';
import { XCircle } from 'lucide-react';

/** S99: 断り確定。否決理由は表示しない（要件定義準拠）。 */
export function RejectedPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-gray-100 py-8 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <div className="flex justify-center mb-6">
            <XCircle className="w-20 h-20 text-red-400" />
          </div>

          <h1 className="text-xl font-bold text-gray-800 mb-3">
            お申込の審査結果について
          </h1>
          <p className="text-gray-600 mb-6">
            誠に申し訳ございませんが、今回のお申込については
            <br />
            ご希望に添えない結果となりました。
          </p>

          <p className="text-sm text-gray-500 mb-8">
            審査基準に関する詳細はお答えしかねますので、あらかじめご了承ください。
          </p>

          <a
            href={CONTACT_URL}
            className="inline-block text-blue-600 hover:text-blue-800 text-sm underline"
          >
            お問い合わせはこちら
          </a>

          <p className="text-xs text-gray-400 mt-6">
            申込番号: {id}
          </p>
        </div>
      </div>
    </div>
  );
}
