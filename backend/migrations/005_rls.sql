-- FlowReach AI — Row Level Security (RLS) Migration
-- Run this in Supabase SQL Editor
-- This migration:
--   1. Adds user_id column (UUID) to all tables
--   2. Enables RLS on all tables
--   3. Creates policies so authenticated users can only access their own data

-- ============================================================
-- 1. ADD user_id COLUMN TO ALL TABLES
-- ============================================================

-- Core tables
ALTER TABLE leads        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE workflows    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE executions   ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE messages     ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE credentials  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE blacklist    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE daily_send_counts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Channel tables
ALTER TABLE channel_accounts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE inbound_messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Feature tables
ALTER TABLE email_templates     ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE email_events        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ab_tests            ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE follow_up_sequences ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE outbound_webhooks   ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE export_history      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- CRM & Team tables
ALTER TABLE crm_integrations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE booking_links    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE team_members     ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE team_activity    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Profile & AI tables
ALTER TABLE profiles         ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ai_chat_messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================
-- 2. CREATE INDEXES ON user_id COLUMNS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_leads_user_id              ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_user_id          ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_user_id         ON executions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id           ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_user_id        ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_user_id          ON blacklist(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_send_counts_user_id  ON daily_send_counts(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_accounts_user_id   ON channel_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_inbound_messages_user_id   ON inbound_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id    ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_events_user_id       ON email_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_user_id           ON ab_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_sequences_user_id ON follow_up_sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_outbound_webhooks_user_id  ON outbound_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_export_history_user_id     ON export_history(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_integrations_user_id   ON crm_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_links_user_id      ON booking_links(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id       ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_user_id      ON team_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id           ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id   ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_id   ON ai_chat_messages(user_id);

-- ============================================================
-- 3. ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE leads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows           ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials         ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist           ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_send_counts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_webhooks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_integrations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_activity       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages    ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS POLICIES — Authenticated users access only their own data
-- ============================================================

-- ─── LEADS ───
CREATE POLICY "leads_select_own" ON leads FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "leads_insert_own" ON leads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leads_update_own" ON leads FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leads_delete_own" ON leads FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── WORKFLOWS ───
CREATE POLICY "workflows_select_own" ON workflows FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "workflows_insert_own" ON workflows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workflows_update_own" ON workflows FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workflows_delete_own" ON workflows FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── EXECUTIONS ───
CREATE POLICY "executions_select_own" ON executions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "executions_insert_own" ON executions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "executions_update_own" ON executions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "executions_delete_own" ON executions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── MESSAGES ───
CREATE POLICY "messages_select_own" ON messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "messages_insert_own" ON messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "messages_update_own" ON messages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "messages_delete_own" ON messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── CREDENTIALS ───
CREATE POLICY "credentials_select_own" ON credentials FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "credentials_insert_own" ON credentials FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "credentials_update_own" ON credentials FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "credentials_delete_own" ON credentials FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── BLACKLIST ───
CREATE POLICY "blacklist_select_own" ON blacklist FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "blacklist_insert_own" ON blacklist FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "blacklist_update_own" ON blacklist FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "blacklist_delete_own" ON blacklist FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── DAILY_SEND_COUNTS ───
CREATE POLICY "daily_send_counts_select_own" ON daily_send_counts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "daily_send_counts_insert_own" ON daily_send_counts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_send_counts_update_own" ON daily_send_counts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_send_counts_delete_own" ON daily_send_counts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── CHANNEL_ACCOUNTS ───
CREATE POLICY "channel_accounts_select_own" ON channel_accounts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "channel_accounts_insert_own" ON channel_accounts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "channel_accounts_update_own" ON channel_accounts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "channel_accounts_delete_own" ON channel_accounts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── INBOUND_MESSAGES ───
CREATE POLICY "inbound_messages_select_own" ON inbound_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "inbound_messages_insert_own" ON inbound_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inbound_messages_update_own" ON inbound_messages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inbound_messages_delete_own" ON inbound_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── EMAIL_TEMPLATES ───
CREATE POLICY "email_templates_select_own" ON email_templates FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "email_templates_insert_own" ON email_templates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "email_templates_update_own" ON email_templates FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "email_templates_delete_own" ON email_templates FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── EMAIL_EVENTS ───
CREATE POLICY "email_events_select_own" ON email_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "email_events_insert_own" ON email_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "email_events_update_own" ON email_events FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "email_events_delete_own" ON email_events FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── AB_TESTS ───
CREATE POLICY "ab_tests_select_own" ON ab_tests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "ab_tests_insert_own" ON ab_tests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ab_tests_update_own" ON ab_tests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ab_tests_delete_own" ON ab_tests FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── FOLLOW_UP_SEQUENCES ───
CREATE POLICY "follow_up_sequences_select_own" ON follow_up_sequences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "follow_up_sequences_insert_own" ON follow_up_sequences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "follow_up_sequences_update_own" ON follow_up_sequences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "follow_up_sequences_delete_own" ON follow_up_sequences FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── OUTBOUND_WEBHOOKS ───
CREATE POLICY "outbound_webhooks_select_own" ON outbound_webhooks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "outbound_webhooks_insert_own" ON outbound_webhooks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "outbound_webhooks_update_own" ON outbound_webhooks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "outbound_webhooks_delete_own" ON outbound_webhooks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── EXPORT_HISTORY ───
CREATE POLICY "export_history_select_own" ON export_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "export_history_insert_own" ON export_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "export_history_update_own" ON export_history FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "export_history_delete_own" ON export_history FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── CRM_INTEGRATIONS ───
CREATE POLICY "crm_integrations_select_own" ON crm_integrations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "crm_integrations_insert_own" ON crm_integrations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "crm_integrations_update_own" ON crm_integrations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "crm_integrations_delete_own" ON crm_integrations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── BOOKING_LINKS ───
CREATE POLICY "booking_links_select_own" ON booking_links FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "booking_links_insert_own" ON booking_links FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "booking_links_update_own" ON booking_links FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "booking_links_delete_own" ON booking_links FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── TEAM_MEMBERS ───
CREATE POLICY "team_members_select_own" ON team_members FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "team_members_insert_own" ON team_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "team_members_update_own" ON team_members FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "team_members_delete_own" ON team_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── TEAM_ACTIVITY ───
CREATE POLICY "team_activity_select_own" ON team_activity FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "team_activity_insert_own" ON team_activity FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "team_activity_update_own" ON team_activity FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "team_activity_delete_own" ON team_activity FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── PROFILES ───
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── AI_CONVERSATIONS ───
CREATE POLICY "ai_conversations_select_own" ON ai_conversations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "ai_conversations_insert_own" ON ai_conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_conversations_update_own" ON ai_conversations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_conversations_delete_own" ON ai_conversations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── AI_CHAT_MESSAGES ───
CREATE POLICY "ai_chat_messages_select_own" ON ai_chat_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "ai_chat_messages_insert_own" ON ai_chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_chat_messages_update_own" ON ai_chat_messages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_chat_messages_delete_own" ON ai_chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. BACKFILL existing rows (optional — run after first user signs up)
-- ============================================================
-- After your first user signs up, get their UUID from auth.users and run:
--
--   UPDATE leads SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE workflows SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE executions SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE messages SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE credentials SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE blacklist SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE daily_send_counts SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE channel_accounts SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE inbound_messages SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE email_templates SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE email_events SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE ab_tests SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE follow_up_sequences SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE outbound_webhooks SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE export_history SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE crm_integrations SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE booking_links SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE team_members SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE team_activity SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE profiles SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE ai_conversations SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--   UPDATE ai_chat_messages SET user_id = '<USER_UUID>' WHERE user_id IS NULL;
--
-- ============================================================
