/*
  # profiles テーブル（auth.users 拡張: ロール管理用）

  管理者ユーザーの作成手順:
    1. Supabase ダッシュボード > Authentication > Users で新規ユーザーを作成
    2. 作成後、以下の SQL を Supabase SQL Editor で実行:
       UPDATE profiles SET role = 'admin' WHERE id = '<作成したユーザーのUUID>';
*/

-- profiles テーブル
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

-- 新規ユーザー作成時に profile を自動生成するトリガー
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS 有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは自分のプロフィールのみ読み取り可
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
