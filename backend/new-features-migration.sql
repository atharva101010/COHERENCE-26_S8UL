-- FlowReach AI: New Feature Tables Migration
-- Run this in Supabase SQL Editor

-- 1. Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT DEFAULT '',
  body TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  tone TEXT DEFAULT 'professional',
  variables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Email Events (for tracking opens/clicks)
CREATE TABLE IF NOT EXISTS email_events (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT REFERENCES messages(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('open', 'click', 'bounce', 'unsubscribe')),
  url TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. A/B Tests
CREATE TABLE IF NOT EXISTS ab_tests (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  variant_a_subject TEXT DEFAULT '',
  variant_a_body TEXT DEFAULT '',
  variant_b_subject TEXT DEFAULT '',
  variant_b_body TEXT DEFAULT '',
  split_ratio INTEGER DEFAULT 50,
  variant_a_sent INTEGER DEFAULT 0,
  variant_a_opened INTEGER DEFAULT 0,
  variant_a_clicked INTEGER DEFAULT 0,
  variant_a_replied INTEGER DEFAULT 0,
  variant_b_sent INTEGER DEFAULT 0,
  variant_b_opened INTEGER DEFAULT 0,
  variant_b_clicked INTEGER DEFAULT 0,
  variant_b_replied INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Follow-Up Sequences
CREATE TABLE IF NOT EXISTS follow_up_sequences (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  steps JSONB DEFAULT '[]'::jsonb,
  trigger_condition TEXT DEFAULT 'no_reply',
  max_attempts INTEGER DEFAULT 3,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  enrolled_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Outbound Webhooks
CREATE TABLE IF NOT EXISTS outbound_webhooks (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events JSONB DEFAULT '["lead.created"]'::jsonb,
  headers JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add tracking columns to messages table (if not exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'opened_at') THEN
    ALTER TABLE messages ADD COLUMN opened_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'clicked_at') THEN
    ALTER TABLE messages ADD COLUMN clicked_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_events_message_id ON email_events(message_id);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_follow_up_sequences_status ON follow_up_sequences(status);
CREATE INDEX IF NOT EXISTS idx_outbound_webhooks_active ON outbound_webhooks(is_active);

-- Disable RLS on new tables (matching existing pattern)
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_webhooks ENABLE ROW LEVEL SECURITY;

-- Allow all access (matching existing pattern from fix-schema-no-auth.sql)
CREATE POLICY "Allow all on email_templates" ON email_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on email_events" ON email_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ab_tests" ON ab_tests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on follow_up_sequences" ON follow_up_sequences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on outbound_webhooks" ON outbound_webhooks FOR ALL USING (true) WITH CHECK (true);
