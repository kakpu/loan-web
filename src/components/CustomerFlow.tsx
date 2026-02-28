import { useState } from 'react';
import { Application, ApplicationState, STATE_LABELS } from '../types';
import { supabase } from '../lib/supabase';
import { dummyPreCredit, dummyEkyc, dummyPayPayPayment } from '../lib/dummyApis';
import { CheckCircle2, XCircle, Loader2, CreditCard } from 'lucide-react';
import { DUMMY_CONTRACT_URL, PRODUCT_NAMES } from '../config';

interface CustomerFlowProps {
  onComplete?: () => void;
}

export function CustomerFlow({ onComplete }: CustomerFlowProps) {
  const [currentStep, setCurrentStep] = useState<'form' | 'result' | 'contract' | 'payment'>('form');
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    birth_date: '',
    desired_amount: '',
    product_name: PRODUCT_NAMES[0] as string,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: newApp, error: createError } = await supabase
        .from('applications')
        .insert({
          email: formData.email,
          phone: formData.phone,
          birth_date: formData.birth_date,
          desired_amount: parseFloat(formData.desired_amount),
          product_name: formData.product_name,
          state: 'S02',
          line_user_id: 'demo-user-' + Date.now(),
        })
        .select()
        .single();

      if (createError) throw createError;

      await supabase.from('state_transitions').insert({
        application_id: newApp.id,
        from_state: 'S01',
        to_state: 'S02',
        reason: '申込受付',
      });

      const creditResult = await dummyPreCredit();

      let newState: ApplicationState = 'S03';
      if (!creditResult.approved) {
        newState = 'S99';
      }

      const { data: updated } = await supabase
        .from('applications')
        .update({
          state: newState,
          credit_limit: creditResult.creditLimit,
        })
        .eq('id', newApp.id)
        .select()
        .single();

      await supabase.from('state_transitions').insert({
        application_id: newApp.id,
        from_state: 'S02',
        to_state: newState,
        reason: creditResult.approved ? '即時与信承認' : '即時与信否決',
      });

      setApplication(updated!);
      setCurrentStep('result');
    } catch (err) {
      setError('申込処理中にエラーが発生しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToContract = async () => {
    if (!application || application.state === 'S99') return;

    setLoading(true);
    try {
      const ekycResult = await dummyEkyc();

      if (!ekycResult.success) {
        await supabase
          .from('applications')
          .update({ state: 'S99' })
          .eq('id', application.id);

        await supabase.from('state_transitions').insert({
          application_id: application.id,
          from_state: application.state,
          to_state: 'S99',
          reason: '本人確認失敗',
        });

        setError('本人確認に失敗しました');
        return;
      }

      const { data: updated } = await supabase
        .from('applications')
        .update({ state: 'S04' })
        .eq('id', application.id)
        .select()
        .single();

      await supabase.from('state_transitions').insert({
        application_id: application.id,
        from_state: application.state,
        to_state: 'S04',
        reason: '本人確認完了',
      });

      await supabase
        .from('contracts')
        .insert({
          application_id: application.id,
          contract_url: DUMMY_CONTRACT_URL,
        });

      setApplication(updated!);
      setCurrentStep('contract');
    } catch (err) {
      setError('処理中にエラーが発生しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignContract = async () => {
    if (!application) return;

    setLoading(true);
    try {
      const { data: updated } = await supabase
        .from('applications')
        .update({ state: 'S07' })
        .eq('id', application.id)
        .select()
        .single();

      await supabase.from('state_transitions').insert({
        application_id: application.id,
        from_state: application.state,
        to_state: 'S07',
        reason: '契約署名完了',
      });

      await supabase
        .from('contracts')
        .update({ signed_at: new Date().toISOString() })
        .eq('application_id', application.id);

      setApplication(updated!);
      setCurrentStep('payment');
    } catch (err) {
      setError('契約処理中にエラーが発生しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayPayPayment = async () => {
    if (!application) return;

    setLoading(true);
    try {
      const paymentResult = await dummyPayPayPayment(application.credit_limit);

      await supabase.from('payments').insert({
        application_id: application.id,
        payment_method: 'paypay',
        amount: application.credit_limit,
        status: 'completed',
        transaction_id: paymentResult.transactionId,
      });

      alert('決済が完了しました！');
      if (onComplete) onComplete();
    } catch (err) {
      setError('決済処理中にエラーが発生しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (currentStep === 'form') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">ローン申込</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              携帯電話番号
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              生年月日
            </label>
            <input
              type="date"
              required
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ご希望金額（円）
            </label>
            <input
              type="number"
              required
              min="10000"
              step="10000"
              value={formData.desired_amount}
              onChange={(e) => setFormData({ ...formData, desired_amount: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              商品名
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

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

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
              '申込する'
            )}
          </button>
        </form>
      </div>
    );
  }

  if (currentStep === 'result') {
    if (!application) return null;

    const isApproved = application.state !== 'S99';

    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
        <div className="text-center mb-6">
          {isApproved ? (
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          )}
          <h1 className="text-2xl font-bold text-gray-800">
            {isApproved ? '即時与信結果' : '申込結果'}
          </h1>
        </div>

        {isApproved ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-gray-600 mb-2">ご利用可能額</p>
              <p className="text-3xl font-bold text-green-700">
                {application.credit_limit.toLocaleString()}円
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-md space-y-2 text-sm">
              <p>
                <span className="text-gray-600">申込番号:</span>{' '}
                <span className="font-mono">{application.id.slice(0, 8)}</span>
              </p>
              <p>
                <span className="text-gray-600">状態:</span>{' '}
                <span className="font-semibold">{STATE_LABELS[application.state]}</span>
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleProceedToContract}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  処理中...
                </>
              ) : (
                '次へ進む'
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-gray-700">
                誠に申し訳ございませんが、今回のお申込につきましては、
                <br />
                ご希望に添えない結果となりました。
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentStep === 'contract') {
    if (!application) return null;

    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">契約書確認</h1>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-gray-700 mb-2">
              以下の契約書をご確認の上、同意いただける場合は署名してください。
            </p>
            <a
              href={DUMMY_CONTRACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              契約書を確認する（PDF）
            </a>
          </div>

          <div className="p-4 bg-gray-50 rounded-md text-sm space-y-1">
            <p>
              <span className="text-gray-600">商品:</span> {application.product_name}
            </p>
            <p>
              <span className="text-gray-600">契約金額:</span>{' '}
              {application.credit_limit.toLocaleString()}円
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSignContract}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                処理中...
              </>
            ) : (
              '同意して署名する'
            )}
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === 'payment') {
    if (!application) return null;

    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">決済方法の選択</h1>

        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
            <p className="font-semibold text-gray-800 mb-1">契約が完了しました</p>
            <p className="text-sm text-gray-600">
              決済方法を選択してお手続きを完了してください。
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600 mb-1">決済金額</p>
            <p className="text-2xl font-bold text-gray-800">
              {application.credit_limit.toLocaleString()}円
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handlePayPayPayment}
              disabled={loading}
              className="w-full p-4 border-2 border-red-500 rounded-md hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <CreditCard className="w-6 h-6 text-red-500" />
              <span className="font-semibold text-gray-800">PayPay で支払う</span>
            </button>

            <button
              disabled
              className="w-full p-4 border-2 border-gray-300 rounded-md bg-gray-100 cursor-not-allowed flex items-center justify-center gap-3"
            >
              <CreditCard className="w-6 h-6 text-gray-400" />
              <span className="text-gray-500">交通系IC（未実装）</span>
            </button>

            <button
              disabled
              className="w-full p-4 border-2 border-gray-300 rounded-md bg-gray-100 cursor-not-allowed flex items-center justify-center gap-3"
            >
              <CreditCard className="w-6 h-6 text-gray-400" />
              <span className="text-gray-500">その他決済（未実装）</span>
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
