// アプリ全体の定数を集約する。
// URL・ラベル・外部リンクはここを変更するだけで全画面に反映される。

/** フロントエンドのベース URL（LINE返信・リダイレクト先で使用） */
export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL ?? 'http://localhost:5173';

/** 契約書ダミー PDF URL（PoC: 固定値。本番では動的生成に置き換える） */
export const DUMMY_CONTRACT_URL = 'https://example.com/contracts/dummy.pdf';

/** 選択可能な商品名一覧 */
export const PRODUCT_NAMES = ['フリーローン', '自動車ローン', '教育ローン'] as const;
export type ProductName = (typeof PRODUCT_NAMES)[number];

/** LINE 公式アカウントの URL（トップページの友だち追加ボタンで使用） */
export const LINE_ADD_FRIEND_URL = import.meta.env.VITE_LINE_ADD_FRIEND_URL ?? '#';

/** 問い合わせ先（断り確定画面などで表示） */
export const CONTACT_URL = import.meta.env.VITE_CONTACT_URL ?? '#';
