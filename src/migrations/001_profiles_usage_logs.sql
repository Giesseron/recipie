-- ─── Run once in Supabase Dashboard ▸ SQL Editor ───────────────────────────
-- Creates the two tables the admin dashboard and cost-tracking need.

-- profiles: mirrors the auth.users row so the app can list users without the
-- service-role key.  Populated automatically by AuthProvider on first login.
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read profiles"
  ON profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- usage_logs: one row per Anthropic API call attempt (including retries).
-- Captures exact token counts so cost can be calculated client-side.
CREATE TABLE IF NOT EXISTS usage_logs (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id     UUID        REFERENCES recipes(id) ON DELETE SET NULL,
  action        TEXT        NOT NULL DEFAULT 'recipe_extraction',
  model         TEXT        NOT NULL,
  input_tokens  INTEGER     NOT NULL DEFAULT 0,
  output_tokens INTEGER     NOT NULL DEFAULT 0,
  success       BOOLEAN     NOT NULL DEFAULT true,
  error_message TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_time ON usage_logs(created_at);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read usage logs"
  ON usage_logs FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "users can insert own usage logs"
  ON usage_logs FOR INSERT WITH CHECK (user_id = auth.uid());
