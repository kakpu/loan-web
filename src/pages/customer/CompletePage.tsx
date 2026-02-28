import { useParams, Navigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

/** S07: 契約・決済完了。申込フローの終端。 */
export function CompletePage() {
  const { id } = useParams<{ id: string }>();

  if (!id) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-gray-100 py-8 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle2 className="w-20 h-20 text-green-500" />
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-3">お申込が完了しました</h1>
          <p className="text-gray-600 mb-6">
            ご契約手続きが正常に完了しました。
            <br />
            ご利用ありがとうございます。
          </p>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-left space-y-2 mb-6">
            <p className="text-sm font-medium text-green-800">今後の流れ</p>
            <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
              <li>ご登録のメールアドレスに契約内容をお送りします</li>
              <li>融資実行は通常 1〜3 営業日以内を予定しています</li>
              <li>ご不明な点は当社カスタマーサポートまでお問い合わせください</li>
            </ul>
          </div>

          <p className="text-xs text-gray-400">
            申込番号: {id}
          </p>
        </div>
      </div>
    </div>
  );
}
