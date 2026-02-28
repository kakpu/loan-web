import { CheckCircle } from 'lucide-react';

interface Props {
  message: string;
}

/** インライン成功通知バナー。状態遷移・審査完了などの成功時に使用する。 */
export function Toast({ message }: Props) {
  return (
    <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      {message}
    </div>
  );
}
