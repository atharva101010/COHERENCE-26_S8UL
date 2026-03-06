-- FlowReach AI — Supabase Schema
-- Run this in your Supabase SQL Editor to create all required tables

CREATE TABLE IF NOT EXISTS leads (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  title TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','replied','converted','bounced','unsubscribed')),
  source TEXT,
  custom_fields TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflows (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  nodes TEXT NOT NULL DEFAULT '[]',
  edges TEXT NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS executions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workflow_id BIGINT NOT NULL REFERENCES workflows(id),
  lead_id BIGINT NOT NULL REFERENCES leads(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','paused')),
  current_node TEXT,
  logs TEXT DEFAULT '[]',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  execution_id BIGINT NOT NULL REFERENCES executions(id),
  lead_id BIGINT NOT NULL REFERENCES leads(id),
  type TEXT DEFAULT 'email' CHECK (type IN ('email','sms','linkedin')),
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','delivered','opened','bounced','failed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blacklist (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_send_counts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS credentials (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
