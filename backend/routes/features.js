import { Router } from 'express';
import supabase from '../db.js';
import { safeJsonParse } from '../utils.js';

const router = Router();

// ── Shared helpers ──────────────────────────────────────────

const STATUS_SCORES = { new: 10, contacted: 20, replied: 35, converted: 50, bounced: -10, unsubscribed: -15 };
const PERSONAL_DOMAINS = new Set(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com']);

function computeTier(score) {
  if (score >= 80) return 'hot';
  if (score >= 50) return 'warm';
  if (score >= 25) return 'cool';
  return 'cold';
}

function computeBasicScore(lead) {
  let score = 0;
  if (lead.email) score += 15;
  if (lead.company) score += 15;
  if (lead.title) score += 10;
  if (lead.name?.includes(' ')) score += 5;
  score += STATUS_SCORES[lead.status] || 0;
  return Math.max(0, Math.min(100, score));
}

function parseCustomFields(lead) {
  return safeJsonParse(lead.custom_fields, {});
}

async function computeDetailedScore(lead) {
  let score = 0;
  const factors = [];

  if (lead.email) { score += 15; factors.push({ factor: 'Has email', points: 15 }); }
  if (lead.company) { score += 15; factors.push({ factor: 'Has company', points: 15 }); }
  if (lead.title) { score += 10; factors.push({ factor: 'Has job title', points: 10 }); }
  if (lead.name?.includes(' ')) { score += 5; factors.push({ factor: 'Full name provided', points: 5 }); }

  const statusPts = STATUS_SCORES[lead.status] || 0;
  score += statusPts;
  factors.push({ factor: `Status: ${lead.status}`, points: statusPts });

  const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('lead_id', lead.id);
  if (msgCount > 0) {
    const msgPts = Math.min(msgCount * 5, 20);
    score += msgPts;
    factors.push({ factor: `${msgCount} messages sent`, points: msgPts });
  }

  const { count: execCount } = await supabase.from('executions').select('*', { count: 'exact', head: true }).eq('lead_id', lead.id);
  if (execCount > 0) {
    const execPts = Math.min(execCount * 3, 15);
    score += execPts;
    factors.push({ factor: `${execCount} workflow executions`, points: execPts });
  }

  return { score: Math.max(0, Math.min(100, score)), factors };
}

// ══════════════════════════════════════════════
// LEAD SCORING
// ══════════════════════════════════════════════

router.post('/lead-score/:id', async (req, res) => {
  try {
    const { data: lead, error } = await supabase.from('leads').select('*').eq('id', Number(req.params.id)).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead not found' });

    const { score, factors } = await computeDetailedScore(lead);
    const tier = computeTier(score);

    const customFields = parseCustomFields(lead);
    customFields.lead_score = score;
    customFields.lead_tier = tier;
    customFields.scored_at = new Date().toISOString();

    await supabase.from('leads').update({ custom_fields: customFields, updated_at: new Date().toISOString() }).eq('id', lead.id);

    res.json({ leadId: lead.id, score, tier, factors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/lead-score-bulk', async (req, res) => {
  try {
    const { data: leads, error } = await supabase.from('leads').select('*');
    if (error) return res.status(500).json({ error: error.message });

    const results = [];
    for (const lead of (leads || [])) {
      const score = computeBasicScore(lead);
      const tier = computeTier(score);

      const customFields = parseCustomFields(lead);
      customFields.lead_score = score;
      customFields.lead_tier = tier;
      customFields.scored_at = new Date().toISOString();

      await supabase.from('leads').update({ custom_fields: customFields, updated_at: new Date().toISOString() }).eq('id', lead.id);
      results.push({ id: lead.id, name: lead.name, score, tier });
    }

    res.json({ scored: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// EMAIL TRACKING
// ══════════════════════════════════════════════

// GET /api/features/track/open/:messageId — Tracking pixel endpoint
router.get('/track/open/:messageId', async (req, res) => {
  try {
    const messageId = Number(req.params.messageId);
    const { data: msg } = await supabase.from('messages').select('id, status').eq('id', messageId).single();
    if (msg) {
      await supabase.from('messages').update({ status: 'opened', opened_at: new Date().toISOString() }).eq('id', messageId);

      // Log the open event
      await supabase.from('email_events').insert({ message_id: messageId, event_type: 'open', ip_address: req.ip, user_agent: req.get('user-agent') || '', created_at: new Date().toISOString() });
    }
  } catch { /* silent */ }

  // Return 1x1 transparent GIF
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.set({ 'Content-Type': 'image/gif', 'Content-Length': pixel.length, 'Cache-Control': 'no-store, no-cache' });
  res.end(pixel);
});

// GET /api/features/track/click/:messageId — Click tracking redirect
router.get('/track/click/:messageId', async (req, res) => {
  try {
    const messageId = Number(req.params.messageId);
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'Missing url parameter' });

    await supabase.from('email_events').insert({ message_id: messageId, event_type: 'click', url, ip_address: req.ip, user_agent: req.get('user-agent') || '', created_at: new Date().toISOString() });
    await supabase.from('messages').update({ status: 'opened', clicked_at: new Date().toISOString() }).eq('id', messageId);

    // Validate URL to prevent open redirect
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) return res.status(400).json({ error: 'Invalid URL' });
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    res.redirect(url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/features/tracking-stats — Get open/click stats
router.get('/tracking-stats', async (req, res) => {
  try {
    const { count: totalSent } = await supabase.from('messages').select('*', { count: 'exact', head: true }).in('status', ['sent', 'delivered', 'opened']);
    const { count: totalOpened } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('status', 'opened');
    const { data: events } = await supabase.from('email_events').select('event_type').order('created_at', { ascending: false }).limit(500);

    const opens = (events || []).filter(e => e.event_type === 'open').length;
    const clicks = (events || []).filter(e => e.event_type === 'click').length;
    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0;

    res.json({ totalSent: totalSent || 0, totalOpened: totalOpened || 0, opens, clicks, openRate: Number(openRate) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/features/email-events — Recent email events with message info
router.get('/email-events', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const { data, error } = await supabase
      .from('email_events')
      .select('*, messages(subject, lead_id, leads(name, email))')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// A/B TESTING
// ══════════════════════════════════════════════

// GET /api/features/ab-tests
router.get('/ab-tests', async (req, res) => {
  try {
    const { data, error } = await supabase.from('ab_tests').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/features/ab-tests — Create A/B test
router.post('/ab-tests', async (req, res) => {
  try {
    const { name, variant_a_subject, variant_a_body, variant_b_subject, variant_b_body, split_ratio } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Test name is required' });

    const { data, error } = await supabase.from('ab_tests').insert({
      name: name.trim(), variant_a_subject, variant_a_body, variant_b_subject, variant_b_body,
      split_ratio: split_ratio || 50, status: 'draft',
      variant_a_sent: 0, variant_a_opened: 0, variant_a_clicked: 0, variant_a_replied: 0,
      variant_b_sent: 0, variant_b_opened: 0, variant_b_clicked: 0, variant_b_replied: 0,
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/features/ab-tests/:id
router.put('/ab-tests/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('ab_tests').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', Number(req.params.id)).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/features/ab-tests/:id
router.delete('/ab-tests/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('ab_tests').delete().eq('id', Number(req.params.id));
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// FOLLOW-UP SEQUENCES
// ══════════════════════════════════════════════

// GET /api/features/sequences
router.get('/sequences', async (req, res) => {
  try {
    const { data, error } = await supabase.from('follow_up_sequences').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/features/sequences
router.post('/sequences', async (req, res) => {
  try {
    const { name, steps, trigger_condition, max_attempts } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Sequence name is required' });

    const { data, error } = await supabase.from('follow_up_sequences').insert({
      name: name.trim(), steps: steps || [], trigger_condition: trigger_condition || 'no_reply',
      max_attempts: max_attempts || 3, status: 'active', enrolled_count: 0, completed_count: 0,
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/features/sequences/:id
router.put('/sequences/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('follow_up_sequences').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', Number(req.params.id)).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/features/sequences/:id
router.delete('/sequences/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('follow_up_sequences').delete().eq('id', Number(req.params.id));
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// ANALYTICS EXPORT
// ══════════════════════════════════════════════

// GET /api/features/analytics/export — Export full analytics as JSON
router.get('/analytics/export', async (req, res) => {
  try {
    const { data: leads } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    const { data: messages } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
    const { data: executions } = await supabase.from('executions').select('*').order('created_at', { ascending: false });
    const { data: workflows } = await supabase.from('workflows').select('id, name, is_active, created_at');

    // Summary stats
    const totalLeads = (leads || []).length;
    const statusCounts = {};
    for (const l of (leads || [])) statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;

    const totalMessages = (messages || []).length;
    const sentCount = (messages || []).filter(m => ['sent', 'delivered', 'opened'].includes(m.status)).length;
    const failedCount = (messages || []).filter(m => m.status === 'failed').length;

    const totalExecutions = (executions || []).length;
    const completedExecs = (executions || []).filter(e => e.status === 'completed').length;

    res.json({
      exportedAt: new Date().toISOString(),
      summary: { totalLeads, totalMessages, sentCount, failedCount, totalExecutions, completedExecs, totalWorkflows: (workflows || []).length },
      leadsByStatus: statusCounts,
      leads: leads || [],
      messages: messages || [],
      executions: executions || [],
      workflows: workflows || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// EXPORT HISTORY
// ══════════════════════════════════════════════

// GET /api/features/export-history — List past exports
router.get('/export-history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('export_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/features/export-history — Log an export
router.post('/export-history', async (req, res) => {
  try {
    const { export_type, record_count, file_name, file_size_bytes } = req.body;
    if (!export_type || !file_name) {
      return res.status(400).json({ error: 'export_type and file_name are required' });
    }

    const { data, error } = await supabase
      .from('export_history')
      .insert({
        export_type,
        record_count: record_count || 0,
        file_name,
        file_size_bytes: file_size_bytes || 0,
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/features/export-history/:id — Delete an export record
router.delete('/export-history/:id', async (req, res) => {
  try {
    const exportId = Number(req.params.id);
    const { data: existing } = await supabase.from('export_history').select('id').eq('id', exportId).single();
    if (!existing) return res.status(404).json({ error: 'Export record not found' });

    const { error } = await supabase.from('export_history').delete().eq('id', exportId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ deleted: true, id: exportId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// WEBHOOKS / ZAPIER CONNECTOR
// ══════════════════════════════════════════════

// GET /api/features/webhooks
router.get('/webhooks', async (req, res) => {
  try {
    const { data, error } = await supabase.from('outbound_webhooks').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/features/webhooks
router.post('/webhooks', async (req, res) => {
  try {
    const { name, url, events, headers } = req.body;
    if (!name?.trim() || !url?.trim()) return res.status(400).json({ error: 'Name and URL are required' });

    // Validate URL
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) return res.status(400).json({ error: 'URL must use http or https' });
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const { data, error } = await supabase.from('outbound_webhooks').insert({
      name: name.trim(), url: url.trim(), events: events || ['lead.created', 'execution.completed'],
      headers: headers || {}, is_active: true, last_triggered: null, trigger_count: 0,
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/features/webhooks/:id
router.put('/webhooks/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('outbound_webhooks').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', Number(req.params.id)).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/features/webhooks/:id
router.delete('/webhooks/:id', async (req, res) => {
  try {
    const webhookId = Number(req.params.id);
    const { data: existing } = await supabase.from('outbound_webhooks').select('id').eq('id', webhookId).single();
    if (!existing) return res.status(404).json({ error: 'Webhook not found' });

    const { error } = await supabase.from('outbound_webhooks').delete().eq('id', webhookId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ deleted: true, id: webhookId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/features/webhooks/:id/test — Test a webhook
router.post('/webhooks/:id/test', async (req, res) => {
  try {
    const { data: webhook, error } = await supabase.from('outbound_webhooks').select('*').eq('id', Number(req.params.id)).single();
    if (error || !webhook) return res.status(404).json({ error: 'Webhook not found' });

    const payload = { event: 'test', timestamp: new Date().toISOString(), data: { message: 'This is a test webhook from FlowReach AI' } };

    const fetchRes = await fetch(webhook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(typeof webhook.headers === 'object' ? webhook.headers : {}) },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    await supabase.from('outbound_webhooks').update({ last_triggered: new Date().toISOString(), trigger_count: (webhook.trigger_count || 0) + 1 }).eq('id', webhook.id);

    res.json({ success: fetchRes.ok, statusCode: fetchRes.status, statusText: fetchRes.statusText });
  } catch (err) {
    res.status(500).json({ error: `Webhook test failed: ${err.message}` });
  }
});

// ══════════════════════════════════════════════
// LEAD ENRICHMENT
// ══════════════════════════════════════════════

router.post('/enrich/:id', async (req, res) => {
  try {
    const { data: lead, error } = await supabase.from('leads').select('*').eq('id', Number(req.params.id)).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead not found' });

    const enrichment = buildEnrichment(lead);
    const customFields = parseCustomFields(lead);
    customFields.enrichment = enrichment;

    await supabase.from('leads').update({ custom_fields: customFields, updated_at: new Date().toISOString() }).eq('id', lead.id);

    res.json({ leadId: lead.id, enrichment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function buildEnrichment(lead) {
  const email = lead.email || '';
  const domain = email.split('@')[1] || '';
  return {
    email_domain: domain,
    email_provider: getEmailProvider(domain),
    company_domain: domain,
    enriched_at: new Date().toISOString(),
    data_completeness: calculateCompleteness(lead),
    account_type: PERSONAL_DOMAINS.has(domain) ? 'Personal' : 'Business',
  };
}

function getEmailProvider(domain) {
  const providers = { 'gmail.com': 'Google', 'outlook.com': 'Microsoft', 'yahoo.com': 'Yahoo', 'hotmail.com': 'Microsoft', 'icloud.com': 'Apple', 'protonmail.com': 'ProtonMail' };
  return providers[domain] || 'Custom Domain';
}

function calculateCompleteness(lead) {
  const fields = ['name', 'email', 'company', 'title'];
  const filled = fields.filter(f => lead[f]?.trim()).length;
  return Math.round((filled / fields.length) * 100);
}

router.post('/enrich-bulk', async (req, res) => {
  try {
    const { data: leads, error } = await supabase.from('leads').select('*');
    if (error) return res.status(500).json({ error: error.message });

    let enriched = 0;
    for (const lead of (leads || [])) {
      const customFields = parseCustomFields(lead);
      customFields.enrichment = buildEnrichment(lead);

      await supabase.from('leads').update({ custom_fields: customFields, updated_at: new Date().toISOString() }).eq('id', lead.id);
      enriched++;
    }

    res.json({ enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// CRM INTEGRATIONS
// ══════════════════════════════════════════════

// GET /api/features/crm-integrations
router.get('/crm-integrations', async (req, res) => {
  try {
    const { data, error } = await supabase.from('crm_integrations').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/features/crm-integrations
router.post('/crm-integrations', async (req, res) => {
  try {
    const { provider, config } = req.body;
    if (!provider?.trim()) return res.status(400).json({ error: 'Provider is required' });

    // Check if already connected
    const { data: existing } = await supabase.from('crm_integrations').select('id').eq('provider', provider).eq('is_connected', true).single();
    if (existing) {
      // Update config
      const { data, error } = await supabase.from('crm_integrations')
        .update({ config: config || {}, updated_at: new Date().toISOString() })
        .eq('id', existing.id).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    const { data, error } = await supabase.from('crm_integrations').insert({
      provider: provider.trim(), config: config || {}, is_connected: true, sync_status: 'idle',
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/features/crm-integrations/:id
router.put('/crm-integrations/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('crm_integrations')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', Number(req.params.id)).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/features/crm-integrations/:provider — Disconnect a CRM
router.delete('/crm-integrations/:provider', async (req, res) => {
  try {
    const { error } = await supabase.from('crm_integrations')
      .update({ is_connected: false, updated_at: new Date().toISOString() })
      .eq('provider', req.params.provider);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// CALENDAR / BOOKING LINKS
// ══════════════════════════════════════════════

// GET /api/features/booking-links
router.get('/booking-links', async (req, res) => {
  try {
    const { data, error } = await supabase.from('booking_links').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/features/booking-links
router.post('/booking-links', async (req, res) => {
  try {
    const { name, duration, url, provider } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Meeting name is required' });

    const { data, error } = await supabase.from('booking_links').insert({
      name: name.trim(), duration: duration || 30, url: url || '', provider: provider || 'calendly', is_active: true,
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/features/booking-links/:id
router.put('/booking-links/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('booking_links')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', Number(req.params.id)).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/features/booking-links/:id
router.delete('/booking-links/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('booking_links').delete().eq('id', Number(req.params.id));
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// TEAM MEMBERS
// ══════════════════════════════════════════════

// GET /api/features/team-members
router.get('/team-members', async (req, res) => {
  try {
    const { data, error } = await supabase.from('team_members').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/features/team-members
router.post('/team-members', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    if (!name?.trim() || !email?.trim()) return res.status(400).json({ error: 'Name and email are required' });

    const { data: existing } = await supabase.from('team_members').select('id').eq('email', email.trim()).single();
    if (existing) return res.status(400).json({ error: 'A team member with this email already exists' });

    const { data, error } = await supabase.from('team_members').insert({
      name: name.trim(), email: email.trim(), role: role || 'Member',
      avatar: name.trim()[0]?.toUpperCase() || '?', status: 'invited', last_active: 'Invited',
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });

    await supabase.from('team_activity').insert({
      user_name: 'You', action: `invited ${name.trim()} as ${role || 'Member'}`,
    });

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/features/team-members/:id
router.put('/team-members/:id', async (req, res) => {
  try {
    const memberId = Number(req.params.id);
    const { data: before } = await supabase.from('team_members').select('name, role').eq('id', memberId).single();
    if (!before) return res.status(404).json({ error: 'Team member not found' });

    const { data, error } = await supabase.from('team_members')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', memberId).select().single();
    if (error) return res.status(500).json({ error: error.message });

    if (req.body.role && req.body.role !== before.role) {
      await supabase.from('team_activity').insert({
        user_name: 'You', action: `changed ${before.name}'s role from ${before.role} to ${req.body.role}`,
      });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/features/team-members/:id
router.delete('/team-members/:id', async (req, res) => {
  try {
    const memberId = Number(req.params.id);
    const { data: member } = await supabase.from('team_members').select('name, role').eq('id', memberId).single();
    if (!member) return res.status(404).json({ error: 'Team member not found' });
    if (member.role === 'Admin') {
      const { count } = await supabase.from('team_members').select('*', { count: 'exact', head: true }).eq('role', 'Admin');
      if (count <= 1) return res.status(400).json({ error: 'Cannot remove the last admin' });
    }

    const { error } = await supabase.from('team_members').delete().eq('id', memberId);
    if (error) return res.status(500).json({ error: error.message });

    await supabase.from('team_activity').insert({
      user_name: 'You', action: `removed ${member.name} from the team`,
    });

    res.json({ deleted: true, id: memberId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/features/team-activity
router.get('/team-activity', async (req, res) => {
  try {
    const { data, error } = await supabase.from('team_activity').select('*').order('created_at', { ascending: false }).limit(20);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
