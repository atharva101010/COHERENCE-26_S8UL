import { Router } from 'express';
import supabase from '../db.js';

const router = Router();

// ─── EMAIL TEMPLATES CRUD ──────────────────────

// GET /api/templates — List all templates
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = supabase.from('email_templates').select('*').order('created_at', { ascending: false });
    if (category && category !== 'all') query = query.eq('category', category);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/templates/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', Number(req.params.id))
      .single();
    if (error || !data) return res.status(404).json({ error: 'Template not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/templates — Create template
router.post('/', async (req, res) => {
  try {
    const { name, subject, body, category, tone, variables } = req.body;
    if (!name?.trim() || !body?.trim()) return res.status(400).json({ error: 'Name and body are required' });
    const { data, error } = await supabase
      .from('email_templates')
      .insert({ name: name.trim(), subject: subject || '', body: body.trim(), category: category || 'general', tone: tone || 'professional', variables: variables || [] })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/templates/:id — Update template
router.put('/:id', async (req, res) => {
  try {
    const { name, subject, body, category, tone, variables } = req.body;
    const { data, error } = await supabase
      .from('email_templates')
      .update({ name, subject, body, category, tone, variables, updated_at: new Date().toISOString() })
      .eq('id', Number(req.params.id))
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/templates/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { error } = await supabase.from('email_templates').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ deleted: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/templates/seed — Seed default templates
router.post('/seed', async (req, res) => {
  try {
    const defaults = [
      { name: 'Cold Outreach Intro', subject: 'Quick question about {{company}}', body: 'Hi {{name}},\n\nI came across {{company}} and was impressed by your work. I\'d love to connect and share how we could help.\n\nWould you have 15 minutes this week for a quick chat?\n\nBest regards', category: 'Cold Outreach', tone: 'professional', variables: ['name', 'company'] },
      { name: 'Gentle Follow-Up', subject: 'Following up — {{company}}', body: 'Hi {{name}},\n\nI wanted to follow up on my previous message. I understand you\'re busy, but I believe there\'s a great opportunity for {{company}}.\n\nWould love to hear your thoughts.\n\nBest', category: 'Follow-Up', tone: 'friendly', variables: ['name', 'company'] },
      { name: 'Quick Call Request', subject: 'Can we schedule a quick call?', body: 'Hello {{name}},\n\nI\'d love to schedule a brief 15-minute call to discuss how we can help {{company}} achieve its goals.\n\nWhat does your calendar look like this week?\n\nCheers', category: 'Meeting Request', tone: 'professional', variables: ['name', 'company'] },
      { name: 'Win-Back Message', subject: 'We miss you, {{name}}!', body: 'Hi {{name}},\n\nIt\'s been a while since we connected. I wanted to reach out and see how things are going at {{company}}.\n\nWe\'ve added some exciting new features that might interest you.\n\nLet me know if you\'d like to catch up!', category: 'Re-engagement', tone: 'casual', variables: ['name', 'company'] },
      { name: 'Post-Meeting Thanks', subject: 'Thanks for your time, {{name}}', body: 'Hi {{name}},\n\nThank you for taking the time to speak with us. It was great learning more about {{company}} and your goals.\n\nI\'ve attached the resources we discussed. Please don\'t hesitate to reach out if you have any questions.\n\nBest regards', category: 'Thank You', tone: 'professional', variables: ['name', 'company'] },
      { name: 'New Feature Announcement', subject: 'Exciting news from our team!', body: 'Hi {{name}},\n\nWe\'re thrilled to announce our latest product update that could benefit {{company}}.\n\nKey highlights:\n• Smarter lead scoring with AI\n• Multi-channel outreach support\n• Real-time execution tracking\n\nWould you like a personalized demo?', category: 'Product Launch', tone: 'friendly', variables: ['name', 'company'] },
    ];
    const { data, error } = await supabase.from('email_templates').insert(defaults).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ seeded: data.length, templates: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
