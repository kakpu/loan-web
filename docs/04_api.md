# REST API 設計

要件定義（`01_requirements.md`）・アーキテクチャ（`02_architecture.md`）・DB設計（`03_database.md`）をベースとした最小構成。
Supabase Edge Functions を実装先とする。

---

## 共通仕様

### Base URL
```
https://{project-ref}.supabase.co/functions/v1
```

### 認証方式

| 種別 | 方式 | 対象API |
|---|---|---|
| 事務担当者 | `Authorization: Bearer {supabase_jwt}` | admin 系エンドポイント |
| LINE Webhook | `x-line-signature` ヘッダーで署名検証 | `/webhook/line` |
| 顧客（PoC） | URL パスに `application_id` を含め、`line_user_id` をボディで照合 | 顧客向けエンドポイント |

> **[PoC]** 顧客認証は簡易実装。本番移行時は LINE Login + Supabase Auth の連携に置き換える。

---

## エラーレスポンス統一形式

すべてのエラーは以下の形式で返却する。

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "メールアドレスの形式が正しくありません",
    "details": [
      { "field": "email", "message": "有効なメールアドレスを入力してください" }
    ]
  }
}
```

### エラーコード一覧

| HTTP | code | 説明 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 入力値のバリデーションエラー |
| 401 | `UNAUTHORIZED` | 認証トークンなし・無効 |
| 403 | `FORBIDDEN` | 権限不足 |
| 404 | `NOT_FOUND` | リソースが存在しない |
| 409 | `INVALID_STATUS_TRANSITION` | 業務状態の遷移が不正 |
| 500 | `INTERNAL_ERROR` | サーバー内部エラー |

---

## 申込（applications）関連

---

### POST /applications
**API**: API-01　**認証**: 不要　**対応状態**: S01（申込開始）

LINE Webhook 経由で申込エンティティを生成し、申込ID（UUID）を発行する。

リクエスト例:
```bash
curl -X POST https://{project}.supabase.co/functions/v1/applications \
  -H "Content-Type: application/json" \
  -d '{ "line_user_id": "U1234567890abcdef" }'
```

レスポンス例 `201 Created`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "line_user_id": "U1234567890abcdef",
  "status": "S01",
  "created_at": "2025-06-01T10:00:00Z"
}
```

**エラー**: `400 VALIDATION_ERROR` — `line_user_id` が未指定

---

### PATCH /applications/{id}
**API**: API-01　**認証**: 不要（line_user_id で照合）　**対応状態**: S01

申込情報（入力途中）を更新する。確定前の中間保存に使用する。

リクエスト例:
```bash
curl -X PATCH https://{project}.supabase.co/functions/v1/applications/550e8400... \
  -H "Content-Type: application/json" \
  -d '{
    "line_user_id": "U1234567890abcdef",
    "email": "taro@example.com",
    "phone": "09012345678",
    "birthdate": "1990-04-01",
    "desired_amount": 300000,
    "product_name": "フリーローン"
  }'
```

レスポンス例 `200 OK`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "S01",
  "email": "taro@example.com",
  "phone": "09012345678",
  "birthdate": "1990-04-01",
  "desired_amount": 300000,
  "product_name": "フリーローン",
  "updated_at": "2025-06-01T10:05:00Z"
}
```

**エラー**:
- `404 NOT_FOUND` — 申込IDが存在しない
- `403 FORBIDDEN` — `line_user_id` が一致しない
- `409 INVALID_STATUS_TRANSITION` — S01 以外の申込を更新しようとした

---

### GET /applications/{id}
**API**: API-01　**認証**: 不要（line_user_id で照合）　**対応状態**: 全状態

申込の現在情報を取得する。顧客画面の初期ロードに使用する。

リクエスト例:
```bash
curl "https://{project}.supabase.co/functions/v1/applications/550e8400...?line_user_id=U1234567890abcdef"
```

レスポンス例 `200 OK`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "S03",
  "email": "taro@example.com",
  "phone": "09012345678",
  "birthdate": "1990-04-01",
  "desired_amount": 300000,
  "product_name": "フリーローン",
  "created_at": "2025-06-01T10:00:00Z",
  "updated_at": "2025-06-01T10:06:00Z"
}
```

**エラー**:
- `404 NOT_FOUND` — 申込IDが存在しない
- `403 FORBIDDEN` — `line_user_id` が一致しない

---

### POST /applications/{id}/validate
**API**: API-02　**認証**: 不要（line_user_id で照合）　**対応状態**: S01 → S02

申込情報のバリデーションを実施し、通過したら S02（申込受付済）へ遷移する。

バリデーション内容:
- メールアドレス形式確認
- 携帯電話番号形式確認（`090`/`080`/`070` 始まり・11桁）
- 生年月日形式確認（`YYYY-MM-DD`・18歳以上）
- 必須項目の存在確認（email / phone / birthdate / desired_amount / product_name）

リクエスト例:
```bash
curl -X POST https://{project}.supabase.co/functions/v1/applications/550e8400.../validate \
  -H "Content-Type: application/json" \
  -d '{ "line_user_id": "U1234567890abcdef" }'
```

レスポンス例 `200 OK`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "S02",
  "validated_at": "2025-06-01T10:06:00Z"
}
```

**エラー**:
- `400 VALIDATION_ERROR` — バリデーション失敗（details に項目別エラーを返す）
- `409 INVALID_STATUS_TRANSITION` — 既に S02 以降の申込

---

### POST /applications/{id}/pre-credit
**API**: API-03　**認証**: 不要（line_user_id で照合）　**対応状態**: S02 → S03 or S99

即時与信ダミーAPIを呼び出し、仮与信結果を返す。
与信可 → S03（即時与信済）へ遷移し仮与信額を返す。与信否 → S99（断り確定）へ遷移。

> **[PoC]** 0〜50万円の与信額 or 断りをランダム返却するダミー応答。

リクエスト例:
```bash
curl -X POST https://{project}.supabase.co/functions/v1/applications/550e8400.../pre-credit \
  -H "Content-Type: application/json" \
  -d '{ "line_user_id": "U1234567890abcdef" }'
```

レスポンス例（与信可） `200 OK`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "S03",
  "credit_result": "approved",
  "approved_amount": 300000
}
```

レスポンス例（与信否） `200 OK`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "S99",
  "credit_result": "rejected"
}
```

**エラー**: `409 INVALID_STATUS_TRANSITION` — S02 以外の申込に対して呼び出した

---

### GET /applications/{id}/status
**API**: API-04　**認証**: 不要（line_user_id で照合）　**対応状態**: 全状態

申込の現在の業務状態コードのみを返す軽量エンドポイント。
顧客画面・事務担当者画面の共通ポーリング用。

リクエスト例:
```bash
curl "https://{project}.supabase.co/functions/v1/applications/550e8400.../status?line_user_id=U1234567890abcdef"
```

レスポンス例 `200 OK`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "S04",
  "status_label": "本人確認待",
  "updated_at": "2025-06-01T10:10:00Z"
}
```

**エラー**: `404 NOT_FOUND` — 申込IDが存在しない

---

### POST /applications/{id}/identity-verification
**API**: API-05　**認証**: 不要（line_user_id で照合）　**対応状態**: S03 → S04

顧客が「次へ進む」操作を行い、本人確認フローを開始する。S04（本人確認待）へ遷移する。

> **[PoC]** eKYC はダミー応答。結果は事務担当者の手動入力で S05 へ遷移させる。

リクエスト例:
```bash
curl -X POST https://{project}.supabase.co/functions/v1/applications/550e8400.../identity-verification \
  -H "Content-Type: application/json" \
  -d '{ "line_user_id": "U1234567890abcdef" }'
```

レスポンス例 `200 OK`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "S04",
  "message": "本人確認の手続きを開始しました。LINEにご案内を送信しました。"
}
```

**エラー**: `409 INVALID_STATUS_TRANSITION` — S03 以外の申込に対して呼び出した

---

### GET /applications/{id}/identity-verification/status
**API**: API-05　**認証**: 不要（line_user_id で照合）　**対応状態**: S04

本人確認の現在ステータスを取得する。顧客画面のポーリング用。

リクエスト例:
```bash
curl "https://{project}.supabase.co/functions/v1/applications/550e8400.../identity-verification/status?line_user_id=U1234567890abcdef"
```

レスポンス例 `200 OK`:
```json
{
  "application_id": "550e8400-e29b-41d4-a716-446655440000",
  "identity_status": "pending",
  "application_status": "S04"
}
```

> `identity_status`: `pending`（確認待）/ `ok`（完了）/ `ng`（失敗）

**エラー**: `404 NOT_FOUND` — 申込IDが存在しない

---

### POST /applications/{id}/documents
**API**: API-06　**認証**: 不要　**対応状態**: S04, S05

> **[PoC] 未実装** — 画面上に「書類アップロードは現在ご利用できません」と表示する。本番移行時に Supabase Storage と連携して実装する。

レスポンス例 `501 Not Implemented`:
```json
{
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "書類アップロードは現在ご利用できません（PoC未実装）"
  }
}
```

---

### GET /applications/{id}/documents
**API**: API-06　**認証**: 不要　**対応状態**: S04, S05

> **[PoC] 未実装** — 上記と同様。

---

### POST /applications/{id}/review
**API**: API-07　**認証**: 必要（admin）　**対応状態**: S05（審査結果を記録）

事務担当者が本人確認補完・在籍確認・審査結果を入力する。
このエンドポイント単体では業務状態は変更しない。状態遷移は API-08（/decision）が担う。

リクエスト例:
```bash
curl -X POST https://{project}.supabase.co/functions/v1/applications/550e8400.../review \
  -H "Authorization: Bearer {admin_jwt}" \
  -H "Content-Type: application/json" \
  -d '{
    "identity_check": "ok",
    "employment_check": "ok",
    "decision": "approved"
  }'
```

レスポンス例 `200 OK`:
```json
{
  "application_id": "550e8400-e29b-41d4-a716-446655440000",
  "identity_check": "ok",
  "employment_check": "ok",
  "decision": "approved",
  "reviewed_by": "admin-uuid",
  "reviewed_at": "2025-06-02T14:00:00Z"
}
```

**エラー**:
- `401 UNAUTHORIZED` — 認証トークンなし
- `403 FORBIDDEN` — admin 以外のユーザー
- `409 INVALID_STATUS_TRANSITION` — S05 以外の申込に対して呼び出した

---

### POST /applications/{id}/decision
**API**: API-08　**認証**: 必要（admin）　**対応状態**: S05 → S06 or S99

API-07 で入力した審査結果をもとに業務状態を確定する。
可決 → S06（契約可）へ遷移し LINE へ契約案内を送信。否決 → S99（断り確定）へ遷移。

> 否決理由は LINE 通知・API レスポンスのいずれにも含めない（要件定義準拠）。

リクエスト例:
```bash
curl -X POST https://{project}.supabase.co/functions/v1/applications/550e8400.../decision \
  -H "Authorization: Bearer {admin_jwt}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

レスポンス例（可決） `200 OK`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "S06",
  "contract_url": "https://example.com/contracts/dummy.pdf"
}
```

レスポンス例（否決） `200 OK`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "S99"
}
```

**エラー**: `409 INVALID_STATUS_TRANSITION` — S05 の review 未登録、または S05 以外の申込

---

### POST /applications/{id}/contract
**API**: API-09　**認証**: 不要（line_user_id で照合）　**対応状態**: S06 → S07

顧客が「同意/署名した」操作を行い、会員として確定させる。
PayPay ダミーAPIを呼び出し、決済完了を返す。

> **[PoC]** PayPay API は常に成功を返すダミー応答。

リクエスト例:
```bash
curl -X POST https://{project}.supabase.co/functions/v1/applications/550e8400.../contract \
  -H "Content-Type: application/json" \
  -d '{ "line_user_id": "U1234567890abcdef" }'
```

レスポンス例 `200 OK`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "S07",
  "signed_at": "2025-06-03T09:00:00Z",
  "payment_method": "paypay",
  "payment_completed_at": "2025-06-03T09:00:05Z"
}
```

**エラー**: `409 INVALID_STATUS_TRANSITION` — S06 以外の申込に対して呼び出した

---

## 管理者（admin）関連

---

### GET /admin/applications
**認証**: 必要（admin）

申込一覧を返す。事務担当者の管理画面で使用する。クエリパラメータでフィルタリング可能。

リクエスト例:
```bash
curl "https://{project}.supabase.co/functions/v1/admin/applications?status=S05" \
  -H "Authorization: Bearer {admin_jwt}"
```

クエリパラメータ:

| パラメータ | 型 | 説明 |
|---|---|---|
| `status` | string | 業務状態でフィルタ（例: `S05`） |
| `limit` | integer | 取得件数（デフォルト: 20） |
| `offset` | integer | オフセット（デフォルト: 0） |

レスポンス例 `200 OK`:
```json
{
  "total": 42,
  "limit": 20,
  "offset": 0,
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "line_user_id": "U1234567890abcdef",
      "status": "S05",
      "product_name": "フリーローン",
      "desired_amount": 300000,
      "updated_at": "2025-06-02T10:00:00Z"
    }
  ]
}
```

**エラー**:
- `401 UNAUTHORIZED` — 認証トークンなし
- `403 FORBIDDEN` — admin 以外のユーザー

---

### POST /admin/applications/{id}/timeout
**認証**: 必要（admin）　**対応状態**: S04 → S99

S04（本人確認待）のタイムアウトを擬似的に発火させる。デモ用エンドポイント。
本番では定期バッチ（30日経過）に置き換える。

> **[PoC]** 実時間待ちなし。管理画面から手動発火する。

リクエスト例:
```bash
curl -X POST https://{project}.supabase.co/functions/v1/admin/applications/550e8400.../timeout \
  -H "Authorization: Bearer {admin_jwt}"
```

レスポンス例 `200 OK`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "S99",
  "reason": "timeout"
}
```

**エラー**: `409 INVALID_STATUS_TRANSITION` — S04 以外の申込に対して呼び出した

---

## LINE Webhook

---

### POST /webhook/line
**認証**: `x-line-signature` ヘッダーで署名検証

LINE からのテキストメッセージを受信し、申込URLを返信する。
顧客が指定キーワード（例: 「申込」）を送信すると申込エンティティを生成して URL を返す。

リクエスト例（LINE プラットフォームから自動送信）:
```json
{
  "destination": "Uxxxxxxxxxxxxxxx",
  "events": [
    {
      "type": "message",
      "replyToken": "nHuyWiB7yP5Zw52FIkcQobQuGDXCTA",
      "source": { "userId": "U1234567890abcdef", "type": "user" },
      "message": { "type": "text", "text": "申込" }
    }
  ]
}
```

処理フロー:
1. `x-line-signature` を検証し、不正リクエストを排除
2. `source.userId`（line_user_id）で申込エンティティを生成（S01）
3. 申込URL（`https://{frontend}/apply/{application_id}`）を LINE に返信

レスポンス例 `200 OK`:
```json
{ "status": "ok" }
```

> LINE プラットフォームの仕様により、Webhook は常に `200 OK` を返す必要がある。

---

## 状態遷移とAPI対応まとめ

```
S01（申込開始）
  │  PATCH /applications/{id}                      ← 入力内容の中間保存
  ↓  POST  /applications/{id}/validate             → S02
S02（申込受付済）
  ↓  POST  /applications/{id}/pre-credit           → S03 or S99
S03（即時与信済）  ─────────────────────────────────→ S99（断り確定）
  ↓  POST  /applications/{id}/identity-verification → S04
S04（本人確認待）
  │  POST  /admin/applications/{id}/timeout        → S99（タイムアウト擬似発火）
  ↓  [admin 手動: S04→S05]
S05（審査中）
  │  POST  /applications/{id}/review               ← 審査内容の記録
  ↓  POST  /applications/{id}/decision             → S06 or S99
S06（契約可）  ──────────────────────────────────────→ S99（断り確定）
  ↓  POST  /applications/{id}/contract             → S07
S07（会員確定）
```
