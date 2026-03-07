-- CRM Integrations table
CREATE TABLE IF NOT EXISTS crm_integrations (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  is_connected BOOLEAN DEFAULT true,
  sync_status TEXT DEFAULT 'idle',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking Links table
CREATE TABLE IF NOT EXISTS booking_links (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  duration INTEGER DEFAULT 30,
  url TEXT DEFAULT '',
  provider TEXT DEFAULT 'calendly',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Members table
CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'Member',
  avatar TEXT DEFAULT '?',
  status TEXT DEFAULT 'invited',
  last_active TEXT DEFAULT 'Invited',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Activity log
CREATE TABLE IF NOT EXISTS team_activity (
  id SERIAL PRIMARY KEY,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default admin team member
INSERT INTO team_members (name, email, role, avatar, status, last_active)
VALUES ('You', 'admin@flowreach.ai', 'Admin', '👤', 'online', 'Now')
ON CONFLICT DO NOTHING;

-- Seed some activity
INSERT INTO team_activity (user_name, action, created_at) VALUES
  ('You', 'created a new workflow', NOW() - INTERVAL '2 minutes'),
  ('You', 'imported 50 leads', NOW() - INTERVAL '15 minutes'),
  ('You', 'executed outreach campaign', NOW() - INTERVAL '1 hour'),
  ('System', 'daily lead scoring completed', NOW() - INTERVAL '3 hours');
