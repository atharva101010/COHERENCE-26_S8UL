import { Router } from 'express';
import supabase from '../db.js';
import { safeJsonParse } from '../utils.js';

const router = Router();

// GET /api/credentials — List all (masks secrets)
router.get('/', async (req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from('credentials')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const credentials = (rows || []).map(c => {
      const config = safeJsonParse(c.config, {});
      const masked = {};
      for (const [key, val] of Object.entries(config)) {
        if (typeof val === 'string' && val.length > 8) {
          masked[key] = val.slice(0, 4) + '•'.repeat(Math.min(val.length - 8, 20)) + val.slice(-4);
        } else {
          masked[key] = val;
        }
      }
      return { ...c, config: masked };
    });
    res.json({ credentials });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/credentials/:id — Full credential (for backend use)
router.get('/:id', async (req, res) => {
  try {
    const { data: row, error } = await supabase
      .from('credentials')
      .select('*')
      .eq('id', Number(req.params.id))
      .single();

    if (error || !row) return res.status(404).json({ error: 'Credential not found' });

    const config = safeJsonParse(row.config, {});
    res.json({ ...row, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/credentials/type/:type — Get credentials by type
router.get('/type/:type', async (req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from('credentials')
      .select('id, name, type')
      .eq('type', req.params.type);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ credentials: rows || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/credentials — Create
router.post('/', async (req, res) => {
  try {
    const { name, type, config } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Name and type required' });

    const { data: created, error } = await supabase
      .from('credentials')
      .insert({
        name: name.trim(),
        type,
        config: JSON.stringify(config || {})
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const parsedConfig = safeJsonParse(created.config, {});
    res.status(201).json({ ...created, config: parsedConfig });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/credentials/:id — Update
router.put('/:id', async (req, res) => {
  try {
    const { name, config } = req.body;
    const id = Number(req.params.id);

    const { data: existing, error: fetchErr } = await supabase
      .from('credentials')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) return res.status(404).json({ error: 'Credential not found' });

    const existingConfig = safeJsonParse(existing.config, {});
    const newConfig = config ? { ...existingConfig, ...config } : existingConfig;

    const { data: updated, error } = await supabase
      .from('credentials')
      .update({
        name: name ?? existing.name,
        config: JSON.stringify(newConfig),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const parsedConfig = safeJsonParse(updated.config, {});
    res.json({ ...updated, config: parsedConfig });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/credentials/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('credentials')
      .delete()
      .eq('id', Number(req.params.id));

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Credential deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
