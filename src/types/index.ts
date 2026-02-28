export type ApplicationState =
  | 'S01'
  | 'S02'
  | 'S03'
  | 'S04'
  | 'S05'
  | 'S06'
  | 'S07'
  | 'S99';

export interface Application {
  id: string;
  line_user_id: string | null;
  email: string;
  phone: string;
  birth_date: string;
  desired_amount: number;
  product_name: string;
  state: ApplicationState;
  credit_limit: number;
  created_at: string;
  updated_at: string;
}

export interface StateTransition {
  id: string;
  application_id: string;
  from_state: ApplicationState;
  to_state: ApplicationState;
  reason: string;
  created_at: string;
}

export interface ReviewResult {
  id: string;
  application_id: string;
  identity_verified: boolean;
  employment_verified: boolean;
  decision: 'approved' | 'rejected';
  reviewer_note: string;
  created_at: string;
}

export interface Contract {
  id: string;
  application_id: string;
  contract_url: string;
  signed_at: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  application_id: string;
  payment_method: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  transaction_id: string;
  created_at: string;
}

export const STATE_LABELS: Record<ApplicationState, string> = {
  S01: '申込開始',
  S02: '申込受付済',
  S03: '即時与信済',
  S04: '本人確認待',
  S05: '審査中',
  S06: '契約可',
  S07: '会員確定',
  S99: '断り確定',
};
