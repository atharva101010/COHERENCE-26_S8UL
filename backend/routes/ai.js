import { Router } from 'express';
import supabase from '../db.js';
import { generateMessage, previewMessages } from '../ai.js';

const router = Router();

// POST /api/ai/generate — Generate a single message for one lead
router.post('/generate', async (req, res) => {
  try {
    const { leadId, prompt, tone, maxLength, credentialId, model } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt template is required' });
    }

    let lead;
    if (leadId) {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', Number(leadId))
        .single();
      if (error || !data) return res.status(404).json({ error: 'Lead not found' });
      lead = data;
    } else {
      lead = req.body.lead || { name: 'John Doe', email: 'john@example.com', company: 'Acme Inc', title: 'CEO' };
    }

    const result = await generateMessage({ lead, prompt, tone, maxLength, credentialId, model });

    // Store in messages table
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        lead_id: lead.id || null,
        type: 'ai_generated',
        subject: result.subject,
        body: result.body,
        status: 'draft',
      });
    if (insertError) console.warn('Failed to store message:', insertError.message);

    res.json(result);
  } catch (err) {
    console.error('AI generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/preview — Preview messages for multiple leads
router.post('/preview', async (req, res) => {
  try {
    const { prompt, tone, maxLength, credentialId, model, leadIds } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt template is required' });
    }

    let leads = [];

    if (leadIds && leadIds.length > 0) {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .in('id', leadIds.map(Number).slice(0, 5));
      if (error) return res.status(500).json({ error: error.message });
      leads = data || [];
    }

    // If no leadIds provided, grab some sample leads
    if (leads.length === 0) {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) return res.status(500).json({ error: error.message });
      leads = data || [];
    }

    // If still no leads, use mock leads
    if (leads.length === 0) {
      leads = [
        { name: 'Sarah Chen', email: 'sarah@techcorp.io', company: 'TechCorp', title: 'VP of Sales' },
        { name: 'Marcus Johnson', email: 'marcus@growthlab.co', company: 'GrowthLab', title: 'Head of Marketing' },
        { name: 'Elena Rodriguez', email: 'elena@startupxyz.com', company: 'StartupXYZ', title: 'CEO' },
      ];
    }

    const results = await previewMessages({ leads, prompt, tone, maxLength, credentialId, model });
    res.json({ previews: results, source: results[0]?.source || 'mock' });
  } catch (err) {
    console.error('AI preview error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
