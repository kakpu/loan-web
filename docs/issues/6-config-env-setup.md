### 背景 / 目的
契約書ダミー URL（`https://example.com/contract-dummy.pdf`）や商品名リストが各コンポーネントにハードコードされている。サイトマップ設計（`05_sitemap.md`）の運用観点に従い `src/config.ts` に集約し、本番切り替え時の変更箇所を 1 箇所に絞る。また `.env.example` を整備して環境構築を再現可能にする。

- 依存: -
- ラベル: frontend, infra

### スコープ / 作業項目
- `src/config.ts` の新規作成（定数集約）
- `CustomerFlow.tsx` / `AdminDashboard.tsx` のハードコード URL を `config.ts` 参照に置き換え
- `.env.example` の作成
- `.gitignore` に `.env` が含まれているか確認・追記

### ゴール / 完了条件（Acceptance Criteria）
- [ ] `src/config.ts` が作成され、契約書ダミー URL・商品名リスト・LINE 公式アカウントリンクなどの定数が定義されている
- [ ] `CustomerFlow.tsx` と `AdminDashboard.tsx` 内の `https://example.com/...` 等のハードコード URL が `config.ts` の定数参照に置き換わっている
- [ ] `.env.example` が作成され `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` の記載がある
- [ ] `.gitignore` に `.env` が含まれている（シークレットが Git に入らない）
- [ ] `npm run lint` と `npm run typecheck` がエラーなしで通過する

### テスト観点
- 手動: `src/config.ts` の URL を変更してビルドし、変更が各画面に反映されることを確認
- 手動: `.env.example` を `.env` にコピーして `npm run dev` が起動することを確認
- 検証方法: `git status` で `.env` が追跡対象外になっていることを確認
