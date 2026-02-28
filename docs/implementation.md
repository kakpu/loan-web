# 実装計画 — Webローン申込システム（PoC）

設計書（`docs/01〜05`）および既存コード（`src/`・`supabase/migrations/`）を参照して作成。

---

### フェーズ構成

| フェーズ | 目的 | 含む Issue |
|---|---|---|
| **Phase 1: 基盤整備** | URL ベースのルーティングと定数管理を整え、後続 Issue の土台を作る | #1, #6 |
| **Phase 2: 顧客フロー完成** | 申込〜決済完了までの全ステップを状態別ページで動かす | #2, #3 |
| **Phase 3: 管理者フロー完成** | 認証付き管理画面で審査・タイムアウト操作を完結させる | #4, #5 |
| **Phase 4: 品質・仕上げ** | `alert()` 除去・個人情報ログ漏洩防止・Lint 通過 | #7 |
| **Phase 5: LINE 連携** | LINE Webhook で申込フローの起点を本来の形にする | #8 |

---

### 依存関係マップ

```
#6（定数・env）  ─────────────────────────────────────────────────────┐
                                                                       ↓
#1（Router）──→ #2（バリデーション）──→ #3（顧客ページ分割）──→ #7（エラー統一）
    │
    ├──→ #4（管理者認証）──→ #5（管理者画面）──→ #7
    │
    └──→ #8（LINE Webhook）
```

**着手順の目安（1人開発）:**
```
Day 1: #6 → #1
Day 2: #2
Day 3: #3
Day 4: #4
Day 5: #5
Day 6: #7
Day 7: #8
```

---

#### Issueアウトライン表

---

##### Issue #1: React Router 導入とページ構成整備

**概要**: `App.tsx` の `useState` ビュー切り替えを React Router v6 に移行し、サイトマップ設計の URL 構成を実現する。
**依存**: -
**ラベル**: frontend, infra
**受け入れ基準（AC）**:
- [ ] `react-router-dom` v6 が `package.json` に追加され `npm install` が通る
- [ ] `/`・`/apply/:id`・`/admin/login`・`/admin`・`/admin/applications/:id` のルートが定義されている
- [ ] `/admin` 配下へ未認証でアクセスすると `/admin/login` へリダイレクトされる
- [ ] ブラウザの戻る・進むで正しいページが表示される
- [ ] `src/pages/customer/` と `src/pages/admin/` にページコンポーネントが配置されている
- [ ] `npm run lint` と `npm run typecheck` がエラーなしで通過する

---

##### Issue #2: 申込フォーム強化（バリデーション・S01〜S02 遷移）

**概要**: HTML5 バリデーションのみの現状に要件定義の形式チェック条件を追加し、インラインエラー表示と S01→S02 遷移を確実にする。
**依存**: #1
**ラベル**: frontend
**受け入れ基準（AC）**:
- [ ] メールアドレス不正形式でフィールド直下にエラーが表示される
- [ ] 携帯電話番号が `090`/`080`/`070` 始まり・ハイフンなし 11 桁でない場合にエラーが表示される
- [ ] 生年月日で 18 歳未満を入力した場合にエラーが表示される
- [ ] 必須項目未入力で「申込確定」を押すと各フィールド直下にエラーが表示される
- [ ] 全バリデーション通過後に `applications` テーブルへ INSERT し S01→S02 に遷移する
- [ ] `console.log` / `console.error` で個人情報（email・phone・birthdate）が出力されていない

---

##### Issue #3: 顧客フローのページ分割（状態別コンポーネント）

**概要**: `CustomerFlow.tsx` の一枚岩構成を解体し、URL と業務状態を 1:1 に対応させた状態別ページを実装する。S05 審査待ち画面（現行未実装）も新規追加。
**依存**: #1, #2
**ラベル**: frontend
**受け入れ基準（AC）**:
- [ ] `/apply/:id` へアクセスすると DB の `state` を読んで対応 URL へ自動リダイレクトされる
- [ ] `/apply/:id/credit`（S03）— 与信可: 仮与信額と「次へ進む」ボタン、与信否: 自動で `/apply/:id/rejected` へ遷移
- [ ] `/apply/:id/identity`（S04）— 本人確認案内と「書類アップロード（未実装）」表示が実装されている
- [ ] `/apply/:id/waiting`（S05）— 審査中メッセージと状態ポーリング（30 秒間隔）が実装されている
- [ ] `/apply/:id/contract`（S06）— 契約書 PDF リンクと「同意して署名する」ボタンが実装されている
- [ ] `/apply/:id/complete`（S07）— 決済完了メッセージが表示される
- [ ] `/apply/:id/rejected`（S99）— 否決理由を含まない断りメッセージが表示される

---

##### Issue #4: 管理者認証（Supabase Auth + admin ロール）

**概要**: 認証なしの管理者画面に Supabase Auth を導入し、`profiles.role = 'admin'` のユーザーのみが管理機能にアクセスできるようにする。
**依存**: #1
**ラベル**: frontend, backend
**受け入れ基準（AC）**:
- [ ] `profiles` テーブルが `auth.users.id` を FK に持ち `role = 'admin'` で管理者を識別できる
- [ ] `/admin/login` にメールアドレス・パスワード入力フォームが実装されている
- [ ] 正しい認証情報でログインすると `/admin` へリダイレクトされる
- [ ] 未認証で `/admin` にアクセスすると `/admin/login` へリダイレクトされる
- [ ] `profiles.role != 'admin'` のユーザーは `/admin/login` へリダイレクトされる
- [ ] 管理画面にログアウトボタンがあり、押下でセッション破棄 → `/admin/login` へ遷移する

---

##### Issue #5: 管理者画面リファクタリング（申込一覧・詳細・審査入力）

**概要**: `AdminDashboard.tsx` を `/admin`（一覧）と `/admin/applications/:id`（詳細・審査入力）に分割し、`alert()` を廃止してインラインフィードバックに置き換える。
**依存**: #1, #4
**ラベル**: frontend
**受け入れ基準（AC）**:
- [ ] `/admin` に申込一覧が表示され、状態バッジ（色分け）と状態フィルタが動作する
- [ ] `/admin/applications/:id` に申込情報・与信額・状態遷移ログが表示される
- [ ] S05 の申込に本人確認補完・在籍確認・可決/否決の審査入力フォームが表示される
- [ ] 審査結果登録後、`review_results` テーブルに INSERT され `state` が S06 or S99 に更新される
- [ ] S04 の申込にタイムアウト擬似発火ボタンが表示され、押下で `state` が S99 に遷移する
- [ ] `alert()` が除去され、成功・エラーはインライン通知で表示される

---

##### Issue #6: config.ts 作成・環境変数整備

**概要**: 各コンポーネントに散在するハードコード URL・定数を `src/config.ts` に集約し、`.env.example` を整備して環境構築を再現可能にする。
**依存**: -
**ラベル**: frontend, infra
**受け入れ基準（AC）**:
- [ ] `src/config.ts` が作成され、契約書ダミー URL・商品名リスト・LINE リンク等の定数が定義されている
- [ ] `CustomerFlow.tsx` と `AdminDashboard.tsx` のハードコード URL が `config.ts` 参照に置き換わっている
- [ ] `.env.example` が作成され `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` の記載がある
- [ ] `.gitignore` に `.env` が含まれている

---

##### Issue #7: エラーハンドリング統一・UX 改善

**概要**: `alert()` と `console.error()` による個人情報漏洩リスクを除去し、共通エラーバナー・成功トーストでフィードバックを統一する。
**依存**: #3, #5
**ラベル**: frontend
**受け入れ基準（AC）**:
- [ ] `alert()` の呼び出しがコードベース全体から除去されている（`grep -r “alert(“ src/` が 0 件）
- [ ] API エラーは画面内の赤いエラーバナーとしてインライン表示される
- [ ] 成功通知はトーストまたは画面内バナーで表示される
- [ ] `console.error()` でエラーオブジェクト以外（email・phone・birthdate）が出力されていない
- [ ] ローディング中はアクションボタンが `disabled` になりスピナーが表示される
- [ ] `npm run lint` と `npm run typecheck` がエラーなしで通過する

---

##### Issue #8: LINE Webhook Edge Function

**概要**: Supabase Edge Function で LINE Webhook を実装し、顧客が「申込」と送ると申込 URL を返信する。現行のダミー `line_user_id` を実際の LINE ユーザー ID に置き換える。
**依存**: #1
**ラベル**: backend
**受け入れ基準（AC）**:
- [ ] `supabase/functions/line-webhook/index.ts` が存在し Deno で実装されている
- [ ] `x-line-signature` ヘッダーが不正な場合に HTTP 400 を返し処理を中断する
- [ ] 「申込」を含むメッセージ受信で `applications` テーブルに INSERT（`state = 'S01'`）し申込 URL を返信する
- [ ] Webhook エンドポイントは常に HTTP 200 を返す（LINE プラットフォーム仕様）
- [ ] `LINE_CHANNEL_SECRET` と `LINE_CHANNEL_ACCESS_TOKEN` は Supabase Secrets で管理されコードにハードコードされていない
- [ ] `supabase functions deploy line-webhook` でデプロイが成功する

---

### 要確認事項

- **管理者初期ユーザー作成**: Supabase ダッシュボードの手動作成でよいか、seed スクリプトを用意するか
- **S05 ポーリング間隔**: 審査待ち画面のポーリングを 30 秒にするか、デモ用に 5 秒に短縮するか
- **LINE Webhook ローカルテスト**: ngrok を使うか、本番環境に直接デプロイして LINE Developers テスト機能を使うか
- **`profiles` テーブルのマイグレーション**: 既存の `20260228024634_*.sql` に追記するか、新規ファイルを作成するか（新規推奨）