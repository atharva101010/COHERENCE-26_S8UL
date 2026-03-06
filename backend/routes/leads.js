import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/leads - list all leads with optional search
router.get('/', (req, res) => {
  const { search, status, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = 'SELECT * FROM leads WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR company LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  // Get total count
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
  const totalRow = db.prepare(countQuery).get(...params);
  const total = totalRow?.total ?? 0;

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);

  const leads = db.prepare(query).all(...params);

  res.json({
    leads,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit))
  });
});

// GET /api/leads/:id - get single lead
router.get('/:id', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(Number(req.params.id));
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }
  res.json(lead);
});

// POST /api/leads/bulk - bulk import leads
router.post('/bulk', (req, res) => {
  const { leads } = req.body;

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: 'leads must be a non-empty array' });
  }

  if (leads.length > 5000) {
    return res.status(400).json({ error: 'Maximum 5000 leads per import' });
  }

  const insert = db.prepare(`
    INSERT INTO leads (name, email, company, title, status, source, custom_fields)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (const lead of leads) {
    if (!lead.name || !lead.email) {
      skipped++;
      errors.push(`Missing name or email for entry: ${JSON.stringify(lead).slice(0, 100)}`);
      continue;
    }

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
      skipped++;
      errors.push(`Invalid email format: ${lead.email}`);
      continue;
    }

    try {
      insert.run(
        String(lead.name),
        String(lead.email),
        lead.company ? String(lead.company) : null,
        lead.title ? String(lead.title) : null,
        'new',
        lead.source ? String(lead.source) : 'csv_import',
        lead.custom_fields ? JSON.stringify(lead.custom_fields) : null
      );
      imported++;
    } catch (err) {
      skipped++;
      errors.push(`Failed to insert ${lead.email}: ${err.message}`);
    }
  }

  res.json({
    imported,
    skipped,
    total: leads.length,
    errors: errors.slice(0, 10)
  });
});

// PUT /api/leads/:id - update a lead
router.put('/:id', (req, res) => {
  const { name, email, company, title, status } = req.body;
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(Number(req.params.id));

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  db.prepare(`
    UPDATE leads SET name = ?, email = ?, company = ?, title = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name ?? lead.name,
    email ?? lead.email,
    company ?? lead.company,
    title ?? lead.title,
    status ?? lead.status,
    Number(req.params.id)
  );

  const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(Number(req.params.id));
  res.json(updated);
});

// DELETE /api/leads/:id - delete a lead
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM leads WHERE id = ?').run(Number(req.params.id));
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Lead not found' });
  }
  res.json({ success: true });
});

export default router;
