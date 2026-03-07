import { Router } from 'express';
import supabase from '../db.js';

const router = Router();

// Default profile object
const DEFAULT_PROFILE = {
  id: 1,
  full_name: 'User',
  email: '',
  phone: '',
  company: '',
  job_title: '',
  bio: '',
  avatar_url: '',
  timezone: 'UTC',
  plan: 'Free',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// In-memory fallback store (persists for server lifetime when Supabase table is missing)
let memoryProfile = { ...DEFAULT_PROFILE };

// Try to ensure profiles table exists
async function ensureProfilesTable() {
  const { error } = await supabase.from('profiles').select('id').limit(1);
  if (error?.message?.includes('profiles')) {
    // Table doesn't exist — try creating it via raw SQL
    const { error: rpcError } = await supabase.rpc('exec_sql', {
      query: `CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL DEFAULT 'User',
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        company TEXT DEFAULT '',
        job_title TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        avatar_url TEXT DEFAULT '',
        timezone TEXT DEFAULT 'UTC',
        plan TEXT DEFAULT 'Free',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );`
    });
    return !rpcError;
  }
  return !error;
}

let profilesTableReady = null;

// GET /api/profile — Get current profile (singleton row)
router.get('/', async (req, res) => {
  try {
    if (profilesTableReady === null) {
      profilesTableReady = await ensureProfilesTable();
    }
    if (!profilesTableReady) {
      return res.json(memoryProfile);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .single();

    if (error && (error.code === 'PGRST116' || error.message?.includes('profiles'))) {
      return res.json(memoryProfile);
    }
    if (error) throw error;
    res.json(data);
  } catch (err) {
    if (err.message?.includes('profiles')) {
      return res.json(memoryProfile);
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/profile — Update or create profile
router.put('/', async (req, res) => {
  try {
    if (profilesTableReady === null) {
      profilesTableReady = await ensureProfilesTable();
    }
    if (!profilesTableReady) {
      memoryProfile = { ...memoryProfile, ...req.body, updated_at: new Date().toISOString() };
      return res.json(memoryProfile);
    }

    const { full_name, email, phone, company, job_title, bio, avatar_url, timezone } = req.body;
    const updates = {
      full_name: full_name || 'User',
      email: email || '',
      phone: phone || '',
      company: company || '',
      job_title: job_title || '',
      bio: bio || '',
      avatar_url: avatar_url || '',
      timezone: timezone || 'UTC',
      updated_at: new Date().toISOString(),
    };

    // Try to get existing profile
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    let result;
    if (existing?.id) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      updates.plan = 'Free';
      updates.created_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('profiles')
        .insert(updates)
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    res.json(result);
  } catch (err) {
    if (err.message?.includes('profiles')) {
      memoryProfile = { ...memoryProfile, ...req.body, updated_at: new Date().toISOString() };
      return res.json(memoryProfile);
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/profile/avatar — Upload avatar (base64)
router.post('/avatar', async (req, res) => {
  try {
    const { base64, filename, contentType } = req.body;
    if (!base64 || !filename) {
      return res.status(400).json({ error: 'base64 and filename are required' });
    }

    // Decode base64
    const buffer = Buffer.from(base64, 'base64');
    const filePath = `avatars/${Date.now()}-${filename}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('app-files')
      .upload(filePath, buffer, {
        contentType: contentType || 'image/png',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('app-files')
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;

    // Update profile with new avatar URL
    if (profilesTableReady !== false) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();

      if (existing?.id) {
        await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      }
    }
    // Also update memory fallback
    memoryProfile.avatar_url = avatarUrl;
    memoryProfile.updated_at = new Date().toISOString();

    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
