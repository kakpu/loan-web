### 背景 / 目的
現在 `App.tsx` の `useState` でビュー切り替えを行っており URL が変わらない。サイトマップ設計（`05_sitemap.md`）に沿った URL ベースのルーティングを実現し、ブラウザの戻る・進む操作と状態別ページ遷移の基盤を整える。

- 依存: -
- ラベル: frontend, infra

### スコープ / 作業項目
- `react-router-dom` v6 のインストール
- `src/pages/` ディレクトリ作成とページコンポーネントの雛形配置
- `App.tsx` のルート定義（`BrowserRouter` + `Routes`）
- `/admin` 配下の認証ガード（未認証 → `/admin/login` リダイレクト）
- 既存の `CustomerFlow` / `AdminDashboard` をページコンポーネントとして移植

### ゴール / 完了条件（Acceptance Criteria）
- [ ] `react-router-dom` v6 が `package.json` に追加され `npm install` が通る
- [ ] `/`、`/apply/:id`、`/admin/login`、`/admin`、`/admin/applications/:id` のルートが定義されている
- [ ] `/admin` 配下へ未認証でアクセスすると `/admin/login` へリダイレクトされる
- [ ] ブラウザの戻る・進むで正しいページが表示される
- [ ] `src/pages/customer/` と `src/pages/admin/` にページコンポーネントが配置されている
- [ ] `npm run lint` と `npm run typecheck` がエラーなしで通過する

### テスト観点
- 手動: 各 URL を直接入力してページが表示されることを確認
- 手動: 未認証で `/admin` にアクセスし `/admin/login` にリダイレクトされることを確認
- 検証方法: ブラウザの URL バーで状態遷移を目視確認

要確認事項:
- Supabase Auth のセッション管理と認証ガードのタイミング（Issue #4 と連携）
