import { useNavigate } from 'react-router-dom';
import { Users, UserCog } from 'lucide-react';
import { LINE_ADD_FRIEND_URL } from '../config';

export function TopPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">Webローン申込システム</h1>
          <p className="text-gray-600">PoC デモ環境</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* お客様向け: LINE 友だち追加へ誘導 */}
          <a
            href={LINE_ADD_FRIEND_URL}
            className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 group block"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">お客様向け</h2>
              <p className="text-sm text-gray-600">
                LINE の友だち追加から申込を開始してください
              </p>
            </div>
          </a>

          {/* 管理者向け: /admin へ遷移 */}
          <button
            onClick={() => navigate('/admin')}
            className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                <UserCog className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">管理者向け</h2>
              <p className="text-sm text-gray-600">申込の管理・審査処理を行うことができます</p>
            </div>
          </button>
        </div>

        <div className="mt-12 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">システム概要</h3>
          <ul className="text-xs text-gray-600 space-y-2">
            <li>• LINE起点の申込フロー（S01〜S07, S99）</li>
            <li>• 即時与信（ダミーAPI）による借入可能額の提示</li>
            <li>• 本人確認・マニュアル審査プロセス</li>
            <li>• 契約書の確認・署名機能</li>
            <li>• PayPay決済連携（PoC ダミー実装）</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
