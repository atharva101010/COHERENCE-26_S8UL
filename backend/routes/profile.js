import { Router } from 'express';
import supabase from '../db.js';

const router = Router();

// GET /api/profile — Get current profile (singleton row)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code === 'PGRST116') {
      // No profile yet — return defaults
      return res.json({
        id: null,
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
      });
    }
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/profile — Update or create profile
router.put('/', async (req, res) => {
  try {
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

    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
