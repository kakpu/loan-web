import { XCircle } from 'lucide-react';

interface Props {
  message: string;
}

/** インラインエラーバナー。API エラーや処理失敗時に使用する。 */
export function ErrorBanner({ message }: Props) {
  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
      <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      {message}
    </div>
  );
}
