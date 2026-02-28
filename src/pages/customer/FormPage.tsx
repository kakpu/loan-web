import { CustomerFlow } from '../../components/CustomerFlow';

/** S01〜S02: 申込フォーム。Issue #2 でバリデーション強化、Issue #3 で再実装予定。 */
export function FormPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <CustomerFlow />
      </div>
    </div>
  );
}
