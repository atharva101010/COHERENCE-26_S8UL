-- ============================================================
-- FlowReach AI — Supabase Schema with RLS
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1) LEADS — CRM contacts
CREATE TABLE IF NOT EXISTS leads (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL DEFAULT auth.uid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  company     TEXT,
  title       TEXT,
  status      TEXT DEFAULT 'new'
                CHECK (status IN ('new','contacted','replied','converted','bounced','unsubscribed')),
  source      TEXT,
  custom_fields TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own leads"
  ON leads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) WORKFLOWS — Automation definitions
CREATE TABLE IF NOT EXISTS workflows (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL DEFAULT auth.uid(),
  name        TEXT NOT NULL,
  description TEXT,
  nodes       JSONB NOT NULL DEFAULT '[]',
  edges       JSONB NOT NULL DEFAULT '[]',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own workflows"
  ON workflows FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3) EXECUTIONS — Workflow run history
CREATE TABLE IF NOT EXISTS executions (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      UUID NOT NULL DEFAULT auth.uid(),
  workflow_id  BIGINT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  lead_id      BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status       TEXT DEFAULT 'pending'
                 CHECK (status IN ('pending','running','completed','failed','paused')),
  current_node TEXT,
  logs         JSONB DEFAULT '[]',
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own executions"
  ON executions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4) MESSAGES — Sent emails / SMS / LinkedIn
CREATE TABLE IF NOT EXISTS messages (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      UUID NOT NULL DEFAULT auth.uid(),
  execution_id BIGINT NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  lead_id      BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type         TEXT DEFAULT 'email'
                 CHECK (type IN ('email','sms','linkedin')),
  subject      TEXT,
  body         TEXT,
  status       TEXT DEFAULT 'draft'
                 CHECK (status IN ('draft','sent','delivered','opened','bounced','failed')),
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own messages"
  ON messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5) BLACKLIST — Blocked email addresses
CREATE TABLE IF NOT EXISTS blacklist (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    UUID NOT NULL DEFAULT auth.uid(),
  email      TEXT NOT NULL,
  reason     TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, email)
);

ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own blacklist"
  ON blacklist FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6) DAILY_SEND_COUNTS — Rate limiting per user per day
CREATE TABLE IF NOT EXISTS daily_send_counts (
  id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  date    TEXT NOT NULL,
  count   INTEGER DEFAULT 0,
  UNIQUE (user_id, date)
);

ALTER TABLE daily_send_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own send counts"
  ON daily_send_counts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7) CREDENTIALS — API keys & SMTP config
CREATE TABLE IF NOT EXISTS credentials (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    UUID NOT NULL DEFAULT auth.uid(),
  name       TEXT NOT NULL,
  type       TEXT NOT NULL,
  config     JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own credentials"
  ON credentials FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_user_id     ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status       ON leads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_email        ON leads(user_id, email);
CREATE INDEX IF NOT EXISTS idx_workflows_user_id  ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_user_id ON executions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id   ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_user   ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_user     ON blacklist(user_id);
