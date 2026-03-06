import { Router } from 'express';
import supabase from '../db.js';

const router = Router();

// GET /api/messages — List all messages with optional filters
router.get('/', async (req, res) => {
  try {
    const { search, status, type, limit = 50, page = 1 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('messages')
      .select('*, leads(name, email)', { count: 'exact' });

    if (search && typeof search === 'string') {
      query = query.or(`subject.ilike.%${search}%,body.ilike.%${search}%`);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    const { data, count, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    res.json({
      messages: data || [],
      total: count || 0,
      page: pageNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/:id — Single message
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*, leads(name, email)')
      .eq('id', Number(req.params.id))
      .single();

    if (error || !data) return res.status(404).json({ error: 'Message not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
