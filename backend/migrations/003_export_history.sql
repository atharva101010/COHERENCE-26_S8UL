-- FlowReach AI: Export History table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS export_history (
  id BIGSERIAL PRIMARY KEY,
  export_type TEXT NOT NULL CHECK (export_type IN ('json', 'leads_csv', 'messages_csv', 'executions_csv', 'workflows_csv')),
  record_count INTEGER DEFAULT 0,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_history_type ON export_history(export_type);
CREATE INDEX IF NOT EXISTS idx_export_history_created ON export_history(created_at DESC);
