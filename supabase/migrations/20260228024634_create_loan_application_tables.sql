/*
  # Webローン申込システム - 初期スキーマ

  1. 新規テーブル
    - `applications`: 申込の基本情報
      - `id` (uuid, primary key)
      - `line_user_id` (text) - LINE連携用のユーザーID
      - `email` (text) - メールアドレス
      - `phone` (text) - 携帯電話番号
      - `birth_date` (date) - 生年月日
      - `desired_amount` (numeric) - 借入希望額
      - `product_name` (text) - 商品名
      - `state` (text) - 現在の業務状態 (S01〜S07, S99)
      - `credit_limit` (numeric) - 与信枠（即時与信結果）
      - `created_at`, `updated_at` - タイムスタンプ
    
    - `state_transitions`: 状態遷移履歴（監査用）
      - `id` (uuid, primary key)
      - `application_id` (uuid, FK) - 申込ID
      - `from_state` (text) - 遷移前の状態
      - `to_state` (text) - 遷移後の状態
      - `reason` (text) - 遷移理由
      - `created_at` - 遷移日時
    
    - `review_results`: マニュアル審査結果（S05用）
      - `id` (uuid, primary key)
      - `application_id` (uuid, FK) - 申込ID
      - `identity_verified` (boolean) - 本人確認補完結果
      - `employment_verified` (boolean) - 在籍確認結果
      - `decision` (text) - 審査決定 ('approved' or 'rejected')
      - `reviewer_note` (text) - 審査メモ
      - `created_at` - 審査日時
    
    - `contracts`: 契約情報
      - `id` (uuid, primary key)
      - `application_id` (uuid, FK) - 申込ID
      - `contract_url` (text) - 契約書URL（PoCではダミー）
      - `signed_at` (timestamptz) - 署名日時
      - `created_at` - 作成日時
    
    - `payments`: 決済情報
      - `id` (uuid, primary key)
      - `application_id` (uuid, FK) - 申込ID
      - `payment_method` (text) - 決済手段 ('paypay')
      - `amount` (numeric) - 決済額
      - `status` (text) - 決済状態 ('completed', 'pending', 'failed')
      - `transaction_id` (text) - 取引ID
      - `created_at` - 決済日時

  2. セキュリティ
    - 全テーブルでRLSを有効化
    - 認証不要のPublic APIとして運用（PoCのため）
    - 本番環境では適切な認証・認可を実装する必要あり
*/

-- applications テーブル
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id text,
  email text NOT NULL,
  phone text NOT NULL,
  birth_date date NOT NULL,
  desired_amount numeric NOT NULL DEFAULT 0,
  product_name text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT 'S01',
  credit_limit numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- state_transitions テーブル
CREATE TABLE IF NOT EXISTS state_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_state text NOT NULL,
  to_state text NOT NULL,
  reason text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- review_results テーブル
CREATE TABLE IF NOT EXISTS review_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  identity_verified boolean DEFAULT false,
  employment_verified boolean DEFAULT false,
  decision text NOT NULL,
  reviewer_note text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- contracts テーブル
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  contract_url text DEFAULT '',
  signed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- payments テーブル
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  payment_method text NOT NULL DEFAULT 'paypay',
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  transaction_id text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_applications_line_user_id ON applications(line_user_id);
CREATE INDEX IF NOT EXISTS idx_applications_state ON applications(state);
CREATE INDEX IF NOT EXISTS idx_state_transitions_application_id ON state_transitions(application_id);
CREATE INDEX IF NOT EXISTS idx_review_results_application_id ON review_results(application_id);
CREATE INDEX IF NOT EXISTS idx_contracts_application_id ON contracts(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_application_id ON payments(application_id);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS有効化（PoCのため全てのユーザーにアクセス許可）
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- PoCのため全アクセス許可（本番では適切な制限が必要）
CREATE POLICY "Allow all access to applications" ON applications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to state_transitions" ON state_transitions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to review_results" ON review_results FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to contracts" ON contracts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to payments" ON payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);