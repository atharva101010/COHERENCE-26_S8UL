import { Router } from 'express';
import supabase from '../db.js';

const router = Router();

// GET /api/leads - list all leads with optional search
router.get('/', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase.from('leads').select('*', { count: 'exact' });

    if (search && typeof search === 'string') {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    const { data: leads, count, error } = await query;

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      leads: leads || [],
      total: count || 0,
      page: pageNum,
      totalPages: Math.ceil((count || 0) / limitNum)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/:id - get single lead
router.get('/:id', async (req, res) => {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', Number(req.params.id))
      .single();

    if (error || !lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateAndMapLead(lead) {
  if (!lead.name || !lead.email) {
    return { valid: false, reason: `Missing name or email for entry: ${JSON.stringify(lead).slice(0, 100)}` };
  }
  if (!EMAIL_RE.test(lead.email)) {
    return { valid: false, reason: `Invalid email format: ${lead.email}` };
  }
  return {
    valid: true,
    data: {
      name: String(lead.name),
      email: String(lead.email),
      company: lead.company ? String(lead.company) : null,
      title: lead.title ? String(lead.title) : null,
      status: 'new',
      source: lead.source ? String(lead.source) : 'csv_import',
      custom_fields: lead.custom_fields ? JSON.stringify(lead.custom_fields) : null
    }
  };
}

// POST /api/leads/bulk - bulk import leads
router.post('/bulk', async (req, res) => {
  try {
    const { leads } = req.body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'leads must be a non-empty array' });
    }

    if (leads.length > 5000) {
      return res.status(400).json({ error: 'Maximum 5000 leads per import' });
    }

    const validLeads = [];
    let skipped = 0;
    const errors = [];

    for (const lead of leads) {
      const result = validateAndMapLead(lead);
      if (result.valid) {
        validLeads.push(result.data);
      } else {
        skipped++;
        errors.push(result.reason);
      }
    }

    let imported = 0;
    if (validLeads.length > 0) {
      for (let i = 0; i < validLeads.length; i += 500) {
        const batch = validLeads.slice(i, i + 500);
        const { data, error } = await supabase.from('leads').insert(batch).select();
        if (error) {
          errors.push(`Batch insert error: ${error.message}`);
          skipped += batch.length;
        } else {
          imported += data.length;
        }
      }
    }

    res.json({
      imported,
      skipped,
      total: leads.length,
      errors: errors.slice(0, 10)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leads/:id - update a lead
router.put('/:id', async (req, res) => {
  try {
    const { name, email, company, title, status, phone } = req.body;
    const id = Number(req.params.id);

    const { data: existing, error: fetchErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) return res.status(404).json({ error: 'Lead not found' });

    const { data: updated, error } = await supabase
      .from('leads')
      .update({
        name: name ?? existing.name,
        email: email ?? existing.email,
        company: company ?? existing.company,
        title: title ?? existing.title,
        status: status ?? existing.status,
        phone: phone ?? existing.phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/:id - delete a lead
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', Number(req.params.id));

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
