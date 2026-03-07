import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
  console.log('Running migration: create tables for CRM, Calendar, and Team...');

  // Test if tables exist by trying to select from them
  // If they don't exist, we'll create them via RPC or direct insert

  // Try crm_integrations
  const { error: crmErr } = await supabase.from('crm_integrations').select('id').limit(1);
  if (crmErr && crmErr.message.includes('does not exist')) {
    console.log('Table crm_integrations does not exist. Please create it in Supabase Dashboard SQL Editor:');
    console.log(`
CREATE TABLE crm_integrations (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  is_connected BOOLEAN DEFAULT true,
  sync_status TEXT DEFAULT 'idle',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
    `);
  } else {
    console.log('✓ crm_integrations table exists');
  }

  // Try booking_links
  const { error: bookErr } = await supabase.from('booking_links').select('id').limit(1);
  if (bookErr && bookErr.message.includes('does not exist')) {
    console.log('Table booking_links does not exist. Please create it in Supabase Dashboard SQL Editor:');
    console.log(`
CREATE TABLE booking_links (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  duration INTEGER DEFAULT 30,
  url TEXT DEFAULT '',
  provider TEXT DEFAULT 'calendly',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
    `);
  } else {
    console.log('✓ booking_links table exists');
  }

  // Try team_members
  const { error: teamErr } = await supabase.from('team_members').select('id').limit(1);
  if (teamErr && teamErr.message.includes('does not exist')) {
    console.log('Table team_members does not exist. Please create it in Supabase Dashboard SQL Editor:');
    console.log(`
CREATE TABLE team_members (
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
    `);
  } else {
    console.log('✓ team_members table exists');
  }

  // Try team_activity
  const { error: actErr } = await supabase.from('team_activity').select('id').limit(1);
  if (actErr && actErr.message.includes('does not exist')) {
    console.log('Table team_activity does not exist. Please create it in Supabase Dashboard SQL Editor:');
    console.log(`
CREATE TABLE team_activity (
  id SERIAL PRIMARY KEY,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
    `);
  } else {
    console.log('✓ team_activity table exists');
  }

  // Seed default admin if team_members is empty
  const { data: existingMembers } = await supabase.from('team_members').select('id').limit(1);
  if (existingMembers && existingMembers.length === 0) {
    const { error } = await supabase.from('team_members').insert({
      name: 'You', email: 'admin@flowreach.ai', role: 'Admin',
      avatar: '👤', status: 'online', last_active: 'Now',
    });
    if (!error) console.log('✓ Seeded default admin team member');
  }

  // Seed activity if empty
  const { data: existingActivity } = await supabase.from('team_activity').select('id').limit(1);
  if (existingActivity && existingActivity.length === 0) {
    await supabase.from('team_activity').insert([
      { user_name: 'You', action: 'created a new workflow' },
      { user_name: 'You', action: 'imported 50 leads' },
      { user_name: 'You', action: 'executed outreach campaign' },
      { user_name: 'System', action: 'daily lead scoring completed' },
    ]);
    console.log('✓ Seeded default team activity');
  }

  console.log('Migration check complete!');
}

migrate().catch(console.error);
