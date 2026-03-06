-- FlowReach AI — Channel tables migration
-- Run this in Supabase SQL Editor

-- 1. channel_accounts: connected messaging accounts
CREATE TABLE IF NOT EXISTS channel_accounts (
  id BIGSERIAL PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'discord', 'slack')),
  account_name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. inbound_messages: messages received from channels
CREATE TABLE IF NOT EXISTS inbound_messages (
  id BIGSERIAL PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'discord', 'slack')),
  channel_account_id BIGINT REFERENCES channel_accounts(id) ON DELETE SET NULL,
  sender_id TEXT,
  sender_name TEXT,
  body TEXT,
  raw_payload JSONB DEFAULT '{}',
  lead_id BIGINT REFERENCES leads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Add channel column to messages table (nullable for backward compat)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'email';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_channel_accounts_channel ON channel_accounts(channel);
CREATE INDEX IF NOT EXISTS idx_inbound_messages_channel ON inbound_messages(channel);
CREATE INDEX IF NOT EXISTS idx_inbound_messages_lead ON inbound_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel);
