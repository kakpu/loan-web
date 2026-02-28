import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { dummyPreCredit } from '../lib/dummyApis';
import { PRODUCT_NAMES } from '../config';
import { Loader2 } from 'lucide-react';
import { ErrorBanner } from './ui/ErrorBanner';

interface Props {
  /** LINE Webhook または TopPage のデモボタンで事前生成した申込ID */
  applicationId: string;
}

// ---- バリデーション関数 ----

function validateEmail(v: string): string | undefined {
  if (!v) return 'メールアドレスを入力してください';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return '有効なメールアドレスを入力してください';
}

function validatePhone(v: string): string | undefined {
  if (!v) return '携帯電話番号を入力してください';
  if (!/^(090|080|070)\d{8}$/.test(v))
    return '090 / 080 / 070 始まりのハイフンなし11桁で入力してください';
}

function validateBirthDate(v: string): string | undefined {
  if (!v) return '生年月日を入力してください';
  const birth = new Date(v);
  const today = new Date();
  const age =
    today.getFullYear() -
    birth.getFullYear() -
    (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
  if (age < 18) return '18歳以上の方のみお申込みいただけます';
}

function validateAmount(v: string): string | undefined {
  if (!v || Number(v) <= 0) return '借入希望額を入力してください';
}

type FormErrors = {
  email?: string;
  phone?: string;
  birth_date?: string;
  desired_amount?: string;
};

// ---- コンポーネント ----

export function ApplicationForm({ applicationId }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    birth_date: '',
    desired_amount: '',
    product_name: PRODUCT_NAMES[0] as string,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  /** 全フィールドを一括検証し、errors を更新する。戻り値: バリデーション通過なら true */
  const validateAll = (): boolean => {
    const next: FormErrors = {
      email: validateEmail(formData.email),
      phone: validatePhone(formData.phone),
      birth_date: validateBirthDate(formData.birth_date),
      desired_amount: validateAmount(formData.desired_amount),
    };
    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;

    setLoading(true);
    setSubmitError(null);

    try {
      // S01 → S02: 申込情報を確定
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          email: formData.email,
          phone: formData.phone,
          birth_date: formData.birth_date,
          desired_amount: parseFloat(formData.desired_amount),
          product_name: formData.product_name,
          state: 'S02',
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      await supabase.from('state_transitions').insert({
        application_id: applicationId,
        from_state: 'S01',
        to_state: 'S02',
        reason: '申込受付',
      });

      // S02 → S03 or S99: 即時与信
      const creditResult = await dummyPreCredit();
      const newState = creditResult.approved ? 'S03' : 'S99';

      await supabase
        .from('applications')
        .update({ state: newState, credit_limit: creditResult.creditLimit })
        .eq('id', applicationId);

      await supabase.from('state_transitions').insert({
        application_id: applicationId,
        from_state: 'S02',
        to_state: newState,
        reason: creditResult.approved ? '即時与信承認' : '即時与信否決',
      });

      navigate(`/apply/${applicationId}/${newState === 'S03' ? 'credit' : 'rejected'}`);
    } catch (err) {
      setSubmitError('申込処理中にエラーが発生しました。しばらくしてからお試しください。');
      // 個人情報を含まないエラーメッセージのみログ出力
      console.error('[ApplicationForm]', err instanceof Error ? err.message : 'unknown error');
    } finally {
      setLoading(false);
    }
  };

  // ---- フィールド共通スタイル ----
  const inputClass = (field: keyof FormErrors) =>
    `w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">ローン申込</h1>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* メールアドレス */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (errors.email) setErrors({ ...errors, email: validateEmail(e.target.value) });
            }}
            className={inputClass('email')}
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>

        {/* 携帯電話番号 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            携帯電話番号 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            placeholder="09012345678"
            value={formData.phone}
            onChange={(e) => {
              setFormData({ ...formData, phone: e.target.value });
              if (errors.phone) setErrors({ ...errors, phone: validatePhone(e.target.value) });
            }}
            className={inputClass('phone')}
          />
          {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
        </div>

        {/* 生年月日 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            生年月日 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.birth_date}
            onChange={(e) => {
              setFormData({ ...formData, birth_date: e.target.value });
              if (errors.birth_date)
                setErrors({ ...errors, birth_date: validateBirthDate(e.target.value) });
            }}
            className={inputClass('birth_date')}
          />
          {errors.birth_date && (
            <p className="mt-1 text-sm text-red-600">{errors.birth_date}</p>
          )}
        </div>

        {/* 借入希望額 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ご希望金額（円） <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="10000"
            step="10000"
            value={formData.desired_amount}
            onChange={(e) => {
              setFormData({ ...formData, desired_amount: e.target.value });
              if (errors.desired_amount)
                setErrors({ ...errors, desired_amount: validateAmount(e.target.value) });
            }}
            className={inputClass('desired_amount')}
          />
          {errors.desired_amount && (
            <p className="mt-1 text-sm text-red-600">{errors.desired_amount}</p>
          )}
        </div>

        {/* 商品名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            商品名 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.product_name}
            onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {PRODUCT_NAMES.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>

        {submitError && <ErrorBanner message={submitError} />}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              処理中...
            </>
          ) : (
            '申込確定'
          )}
        </button>
      </form>
    </div>
  );
}
