### 背景 / 目的
`CustomerFlow.tsx` と `AdminDashboard.tsx` で `alert()` と `console.error()` が多用されており、個人情報がコンソールに出力されるリスクがある。CLAUDE.md のセキュリティルールおよびコードスタイルルールに従い、エラーハンドリングを統一してユーザー体験を改善する。

- 依存: #3, #5
- ラベル: frontend

### スコープ / 作業項目
- コードベース全体の `alert()` 呼び出しを除去
- `console.error(err)` で個人情報が出る箇所を特定・除去（エラーオブジェクトのみ出力）
- 共通エラーバナーコンポーネントの作成（`src/components/ui/ErrorBanner.tsx`）
- 共通成功トーストコンポーネントの作成（`src/components/ui/Toast.tsx`）
- ローディング状態の統一（ボタン `disabled` + スピナー）

### ゴール / 完了条件（Acceptance Criteria）
- [ ] `alert()` の呼び出しがコードベース全体から除去されている（`grep -r "alert(" src/` が 0 件）
- [ ] API エラーは画面内の赤いエラーバナーとしてインライン表示される
- [ ] 審査完了・状態遷移完了などの成功通知はトーストまたは画面内バナーで表示される
- [ ] `console.error()` でエラーオブジェクト以外（email・phone・birthdate）が出力されていない
- [ ] ローディング中はアクションボタンが `disabled` になり、`Loader2` アイコンのスピナーが表示される
- [ ] `npm run lint` と `npm run typecheck` がエラーなしで通過する

### テスト観点
- 手動: 意図的に Supabase の接続を切り、エラーバナーが表示されることを確認
- 手動: DevTools の Console タブで `console.error` の出力内容に個人情報が含まれないことを確認
- 検証方法: `grep -r "alert(" src/` が 0 件であることをターミナルで確認
