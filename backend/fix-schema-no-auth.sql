-- ============================================================
-- FlowReach AI — Fix Schema for No-Auth Usage
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1) Drop all RLS policies
DROP POLICY IF EXISTS "Users manage their own leads" ON leads;
DROP POLICY IF EXISTS "Users manage their own workflows" ON workflows;
DROP POLICY IF EXISTS "Users manage their own executions" ON executions;
DROP POLICY IF EXISTS "Users manage their own messages" ON messages;
DROP POLICY IF EXISTS "Users manage their own blacklist" ON blacklist;
DROP POLICY IF EXISTS "Users manage their own send counts" ON daily_send_counts;
DROP POLICY IF EXISTS "Users manage their own credentials" ON credentials;

-- 2) Disable RLS on all tables
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE executions DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_send_counts DISABLE ROW LEVEL SECURITY;
ALTER TABLE credentials DISABLE ROW LEVEL SECURITY;

-- 3) Make user_id nullable and remove default
ALTER TABLE leads ALTER COLUMN user_id DROP NOT NULL, ALTER COLUMN user_id SET DEFAULT NULL;
ALTER TABLE workflows ALTER COLUMN user_id DROP NOT NULL, ALTER COLUMN user_id SET DEFAULT NULL;
ALTER TABLE executions ALTER COLUMN user_id DROP NOT NULL, ALTER COLUMN user_id SET DEFAULT NULL;
ALTER TABLE messages ALTER COLUMN user_id DROP NOT NULL, ALTER COLUMN user_id SET DEFAULT NULL;
ALTER TABLE blacklist ALTER COLUMN user_id DROP NOT NULL, ALTER COLUMN user_id SET DEFAULT NULL;
ALTER TABLE daily_send_counts ALTER COLUMN user_id DROP NOT NULL, ALTER COLUMN user_id SET DEFAULT NULL;
ALTER TABLE credentials ALTER COLUMN user_id DROP NOT NULL, ALTER COLUMN user_id SET DEFAULT NULL;

-- 4) Drop unique constraints that include user_id
ALTER TABLE blacklist DROP CONSTRAINT IF EXISTS blacklist_user_id_email_key;
ALTER TABLE daily_send_counts DROP CONSTRAINT IF EXISTS daily_send_counts_user_id_date_key;

-- 5) Re-add unique constraints without user_id
ALTER TABLE blacklist ADD CONSTRAINT blacklist_email_key UNIQUE (email);
ALTER TABLE daily_send_counts ADD CONSTRAINT daily_send_counts_date_key UNIQUE (date);

-- 6) Verify: list all tables to confirm
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
