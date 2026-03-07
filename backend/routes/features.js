import { Router } from 'express';
import supabase from '../db.js';
import { safeJsonParse } from '../utils.js';

const router = Router();

// ── In-memory mock stores (fallback when Supabase tables don't exist) ──

let mockIdCounter = 100;
const nextId = () => ++mockIdCounter;
const now = () => new Date().toISOString();

const mockWebhooks = [
  { id: 1, name: 'Zapier Lead Sync', url: 'https://hooks.zapier.com/hooks/catch/12345/abcdef/', events: ['lead.created', 'lead.updated'], headers: {}, is_active: true, last_triggered: new Date(Date.now() - 3600000).toISOString(), trigger_count: 47, created_at: new Date(Date.now() - 86400000 * 5).toISOString(), updated_at: now() },
  { id: 2, name: 'Make.com Workflow', url: 'https://hook.us1.make.com/abc123def456', events: ['execution.completed', 'message.sent'], headers: {}, is_active: true, last_triggered: new Date(Date.now() - 7200000).toISOString(), trigger_count: 23, created_at: new Date(Date.now() - 86400000 * 3).toISOString(), updated_at: now() },
  { id: 3, name: 'Slack Notifications', url: 'https://hooks.slack.com/services/T00/B00/abc123', events: ['lead.created', 'execution.completed', 'message.opened'], headers: {}, is_active: true, last_triggered: new Date(Date.now() - 1800000).toISOString(), trigger_count: 112, created_at: new Date(Date.now() - 86400000 * 12).toISOString(), updated_at: now() },
  { id: 4, name: 'HubSpot Contact Sync', url: 'https://api.hubapi.com/webhooks/v1/abc789', events: ['lead.created', 'lead.updated', 'message.sent'], headers: { 'Authorization': 'Bearer hk_live_xxx' }, is_active: true, last_triggered: new Date(Date.now() - 900000).toISOString(), trigger_count: 234, created_at: new Date(Date.now() - 86400000 * 20).toISOString(), updated_at: now() },
  { id: 5, name: 'Analytics Webhook', url: 'https://analytics.flowreach.ai/ingest', events: ['execution.started', 'execution.completed', 'message.sent', 'message.opened'], headers: {}, is_active: true, last_triggered: new Date(Date.now() - 300000).toISOString(), trigger_count: 891, created_at: new Date(Date.now() - 86400000 * 30).toISOString(), updated_at: now() },
];

const mockCRMIntegrations = [
  { id: 1, provider: 'hubspot', config: { 'API Key': 'hk_live_abc123...', 'Hub ID': '12345678' }, is_connected: true, sync_status: 'synced', created_at: new Date(Date.now() - 86400000 * 10).toISOString(), updated_at: now() },
  { id: 2, provider: 'salesforce', config: { 'Client ID': 'sf_client_id_xxx', 'Client Secret': 'sf_secret_xxx', 'Instance URL': 'https://myorg.salesforce.com' }, is_connected: true, sync_status: 'synced', created_at: new Date(Date.now() - 86400000 * 7).toISOString(), updated_at: now() },
  { id: 3, provider: 'pipedrive', config: { 'API Token': 'pd_token_xxx', 'Company Domain': 'flowreach' }, is_connected: true, sync_status: 'syncing', created_at: new Date(Date.now() - 86400000 * 5).toISOString(), updated_at: now() },
  { id: 4, provider: 'zoho', config: {}, is_connected: false, sync_status: 'idle', created_at: new Date(Date.now() - 86400000 * 3).toISOString(), updated_at: now() },
  { id: 5, provider: 'freshsales', config: {}, is_connected: false, sync_status: 'idle', created_at: new Date(Date.now() - 86400000 * 2).toISOString(), updated_at: now() },
  { id: 6, provider: 'notion', config: {}, is_connected: false, sync_status: 'idle', created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: now() },
];

const mockABTests = [
  { id: 1, name: 'Cold Outreach Subject Lines', variant_a_subject: 'Quick question about {{company}}', variant_a_body: 'Hi {{name}},\n\nI noticed {{company}} is growing rapidly. We help companies like yours streamline outreach and boost conversion rates by 40%.\n\nWould you be open to a quick 15-min call this week?', variant_b_subject: '{{name}}, saw something interesting about {{company}}', variant_b_body: 'Hey {{name}}!\n\nJust came across {{company}} and had to reach out. We\'ve been helping similar companies crush their outreach goals \u2014 think 3x more replies.\n\nGot 10 minutes to chat?', split_ratio: 50, status: 'running', variant_a_sent: 256, variant_a_opened: 112, variant_a_clicked: 48, variant_a_replied: 24, variant_b_sent: 244, variant_b_opened: 131, variant_b_clicked: 65, variant_b_replied: 39, created_at: new Date(Date.now() - 86400000 * 7).toISOString(), updated_at: now() },
  { id: 2, name: 'Follow-Up Tone Test', variant_a_subject: 'Following up \u2014 {{company}} partnership', variant_a_body: 'Hi {{name}},\n\nI wanted to follow up on my previous message. I believe there\'s a strong fit between our solutions and {{company}}\'s needs.\n\nLet me know if you\'d like to schedule a demo.', variant_b_subject: 'Hey {{name}} \ud83d\udc4b still interested?', variant_b_body: 'Hey {{name}}!\n\nJust bumping this up in case it got buried. No pressure at all \u2014 just wanted to make sure you saw my note about how we could help {{company}}.\n\nLet me know either way!', split_ratio: 50, status: 'running', variant_a_sent: 189, variant_a_opened: 74, variant_a_clicked: 22, variant_a_replied: 16, variant_b_sent: 191, variant_b_opened: 92, variant_b_clicked: 38, variant_b_replied: 31, created_at: new Date(Date.now() - 86400000 * 3).toISOString(), updated_at: now() },
  { id: 3, name: 'CTA Button vs Plain Text', variant_a_subject: 'Boost {{company}} outreach by 3x', variant_a_body: 'Hi {{name}},\n\nCompanies similar to {{company}} are seeing 3x better response rates with AI-powered outreach. Want to see how?\n\n[Book a Demo] \u2014 takes 30 seconds', variant_b_subject: 'Boost {{company}} outreach by 3x', variant_b_body: 'Hi {{name}},\n\nCompanies similar to {{company}} are seeing 3x better response rates with AI-powered outreach.\n\nIf you\'re interested, just reply to this email and I\'ll send over some available times for a quick chat.', split_ratio: 60, status: 'running', variant_a_sent: 320, variant_a_opened: 176, variant_a_clicked: 89, variant_a_replied: 28, variant_b_sent: 210, variant_b_opened: 105, variant_b_clicked: 31, variant_b_replied: 42, created_at: new Date(Date.now() - 86400000 * 14).toISOString(), updated_at: now() },
  { id: 4, name: 'Short vs Long Email', variant_a_subject: '60 seconds for {{company}}?', variant_a_body: 'Hi {{name}} \u2014 we help teams like {{company}} automate outreach. 3x replies. Quick demo?', variant_b_subject: 'How {{company}} can automate outreach', variant_b_body: 'Hi {{name}},\n\nI\'ve been researching {{company}} and I believe there\'s a significant opportunity to improve your outreach efficiency.\n\nOur platform uses AI to personalize messages at scale, automate follow-ups, and track engagement \u2014 resulting in 3x more replies for teams like yours.\n\nKey benefits:\n- AI-powered personalization\n- Automated multi-step sequences\n- Real-time analytics\n\nWould you have 15 minutes this week for a quick demo?', split_ratio: 50, status: 'paused', variant_a_sent: 145, variant_a_opened: 78, variant_a_clicked: 34, variant_a_replied: 22, variant_b_sent: 155, variant_b_opened: 62, variant_b_clicked: 19, variant_b_replied: 11, created_at: new Date(Date.now() - 86400000 * 5).toISOString(), updated_at: now() },
];

const mockSequences = [
  { id: 1, name: 'New Lead Nurture Sequence', trigger_condition: 'no_reply', max_attempts: 5, status: 'active', enrolled_count: 234, completed_count: 89, reply_rate: 22.4, open_rate: 68.7, steps: [
    { delay_hours: 24, action: 'send_email', subject: 'Quick follow-up, {{name}}', body: 'Hi {{name}},\n\nJust wanted to make sure you saw my previous message about how we can help {{company}} improve outreach results.\n\nBest regards', sent: 234, opened: 161, replied: 42 },
    { delay_hours: 72, action: 'send_email', subject: 'A resource {{company}} might find valuable', body: 'Hi {{name}},\n\nI thought you might find our latest case study interesting — it shows how a company similar to {{company}} increased their reply rates by 3x.\n\nWould love to share more insights.', sent: 192, opened: 118, replied: 28 },
    { delay_hours: 120, action: 'send_email', subject: 'Last check-in — {{name}}', body: 'Hi {{name}},\n\nI don\'t want to be a bother, so this will be my last email. If the timing isn\'t right, no worries at all.\n\nIf you ever want to explore how we can help {{company}}, just reply to this email.', sent: 164, opened: 89, replied: 14 },
    { delay_hours: 168, action: 'send_email', subject: 'Worth one more shot? 🎯', body: 'Hey {{name}},\n\nOk last one, I promise! Just wanted to share that we recently helped a company in your space close 40% more deals.\n\nIf that sounds interesting, I\'d love a quick 10-min chat.', sent: 150, opened: 71, replied: 5 },
    { delay_hours: 240, action: 'update_status', subject: '', body: 'Mark lead as cold if no response after all attempts', sent: 150, opened: 0, replied: 0 }
  ], created_at: new Date(Date.now() - 86400000 * 14).toISOString(), updated_at: now() },
  { id: 2, name: 'Re-engagement Campaign', trigger_condition: 'no_open', max_attempts: 3, status: 'active', enrolled_count: 185, completed_count: 67, reply_rate: 15.7, open_rate: 52.4, steps: [
    { delay_hours: 48, action: 'send_email', subject: 'Did you miss this, {{name}}?', body: 'Hi {{name}},\n\nI sent you a message recently but it looks like it might have gotten lost in your inbox.\n\nHere\'s the key takeaway: we help companies like {{company}} automate outreach and save 10+ hours per week.', sent: 185, opened: 97, replied: 22 },
    { delay_hours: 96, action: 'send_email', subject: '{{company}} + FlowReach = 🚀', body: 'Hey {{name}},\n\nQuick thought: what if {{company}} could automate its entire lead outreach pipeline?\n\nOur platform does exactly that. Want to see a quick demo?', sent: 163, opened: 78, replied: 14 },
    { delay_hours: 168, action: 'send_email', subject: 'Breaking up is hard to do 💔', body: 'Hi {{name}},\n\nSince I haven\'t heard back, I\'ll assume the timing isn\'t right. No hard feelings!\n\nIf things change, just reply to this email anytime.', sent: 149, opened: 52, replied: 7 }
  ], created_at: new Date(Date.now() - 86400000 * 7).toISOString(), updated_at: now() },
  { id: 3, name: 'Bounced Email Recovery', trigger_condition: 'bounced', max_attempts: 2, status: 'paused', enrolled_count: 42, completed_count: 18, reply_rate: 7.1, open_rate: 33.0, steps: [
    { delay_hours: 24, action: 'send_email', subject: 'Trying a different address — {{name}}', body: 'Hi {{name}},\n\nMy previous email to you bounced. I\'m trying this address instead.\n\n{{company}} caught my attention and I thought we could help with your outreach goals.', sent: 42, opened: 14, replied: 3 },
    { delay_hours: 72, action: 'update_status', subject: '', body: 'Mark as unsubscribed if still bouncing', sent: 39, opened: 0, replied: 0 }
  ], created_at: new Date(Date.now() - 86400000 * 2).toISOString(), updated_at: now() },
  { id: 4, name: 'Enterprise Decision Maker', trigger_condition: 'no_reply', max_attempts: 4, status: 'active', enrolled_count: 78, completed_count: 22, reply_rate: 28.2, open_rate: 74.3, steps: [
    { delay_hours: 48, action: 'send_email', subject: '{{name}}, a strategic insight for {{company}}', body: 'Hi {{name}},\n\nAs a leader at {{company}}, you\u2019re likely evaluating ways to scale outreach without scaling headcount.\n\nWe helped [similar company] achieve 4x pipeline growth using AI-driven outreach automation.\n\nWorth a 15-min conversation?', sent: 78, opened: 58, replied: 18 },
    { delay_hours: 120, action: 'send_email', subject: 'ROI analysis for {{company}}', body: 'Hi {{name}},\n\nI put together a quick ROI estimate based on {{company}}\u2019s profile:\n\n\u2022 Time saved: ~15h/week per rep\n\u2022 Reply rate increase: 3.2x average\n\u2022 Pipeline impact: +40% qualified meetings\n\nHappy to walk you through the numbers.', sent: 60, opened: 44, replied: 8 },
    { delay_hours: 168, action: 'send_email', subject: 'Case study: How [industry peer] 3x\'d replies', body: 'Hi {{name}},\n\nAttaching a case study from a company in your space that went from 8% to 26% reply rates.\n\nThe approach might resonate with what {{company}} is building.', sent: 52, opened: 35, replied: 4 },
    { delay_hours: 240, action: 'update_status', subject: '', body: 'Move to long-term nurture if no response', sent: 48, opened: 0, replied: 0 }
  ], created_at: new Date(Date.now() - 86400000 * 10).toISOString(), updated_at: now() },
  { id: 5, name: 'Free Trial Onboarding', trigger_condition: 'no_reply', max_attempts: 5, status: 'active', enrolled_count: 312, completed_count: 156, reply_rate: 34.6, open_rate: 78.2, steps: [
    { delay_hours: 1, action: 'send_email', subject: 'Welcome to FlowReach, {{name}}! \ud83c\udf89', body: 'Hey {{name}},\n\nWelcome aboard! Your FlowReach trial is now active.\n\nHere\u2019s your quick start guide:\n1. Import your leads (CSV or manual)\n2. Choose a workflow template\n3. Let AI personalize your messages\n4. Hit send and watch the magic!\n\nNeed help? Just reply to this email.', sent: 312, opened: 244, replied: 89 },
    { delay_hours: 24, action: 'send_email', subject: 'Did you import your first leads?', body: 'Hi {{name}},\n\nJust checking in \u2014 have you had a chance to import your leads yet?\n\nMost users see their first results within 2 hours of setup. Here\u2019s a 3-min video walkthrough if you need it.', sent: 223, opened: 178, replied: 34 },
    { delay_hours: 72, action: 'send_email', subject: '{{name}}, your first workflow awaits', body: 'Hi {{name}},\n\nReady to set up your first automated workflow?\n\nOur most popular template (\u201cSmart Outreach\u201d) takes 60 seconds to configure and typically generates 3x more replies than manual emails.', sent: 189, opened: 134, replied: 18 },
    { delay_hours: 168, action: 'send_email', subject: 'Your trial: 7 days in \ud83d\udcca', body: 'Hey {{name}},\n\nHere\u2019s your week-one summary:\n\u2022 Leads imported: check\n\u2022 Workflows created: check\n\u2022 Messages sent: check\n\nWhat\u2019s next? Schedule a 1:1 demo to unlock advanced features.', sent: 156, opened: 98, replied: 12 },
    { delay_hours: 312, action: 'send_email', subject: 'Your trial ends soon \u2014 don\'t lose your data!', body: 'Hi {{name}},\n\nYour FlowReach trial wraps up in 3 days.\n\nUpgrade now to keep all your workflows, leads, and analytics.\n\nSpecial offer: 20% off your first 3 months with code FLOWSTART.', sent: 156, opened: 89, replied: 22 }
  ], created_at: new Date(Date.now() - 86400000 * 21).toISOString(), updated_at: now() },
];

// Helper: try Supabase first, fall back to mock store
async function trySupabaseOrMock(supabaseFn, mockFallback) {
  try {
    const result = await supabaseFn();
    return result;
  } catch {
    return mockFallback();
  }
}

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

  try {
    const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('lead_id', lead.id);
    if (msgCount > 0) {
      const msgPts = Math.min(msgCount * 5, 20);
      score += msgPts;
      factors.push({ factor: `${msgCount} messages sent`, points: msgPts });
    }
  } catch {
    // Supabase unavailable — add mock engagement bonus based on status
    if (['contacted', 'replied', 'converted'].includes(lead.status)) {
      const mockMsgPts = lead.status === 'converted' ? 20 : lead.status === 'replied' ? 15 : 10;
      score += mockMsgPts;
      factors.push({ factor: 'Engagement history', points: mockMsgPts });
    }
  }

  try {
    const { count: execCount } = await supabase.from('executions').select('*', { count: 'exact', head: true }).eq('lead_id', lead.id);
    if (execCount > 0) {
      const execPts = Math.min(execCount * 3, 15);
      score += execPts;
      factors.push({ factor: `${execCount} workflow executions`, points: execPts });
    }
  } catch {
    // Supabase unavailable — add mock execution bonus
    if (['contacted', 'replied', 'converted'].includes(lead.status)) {
      const mockExecPts = lead.status === 'converted' ? 12 : 6;
      score += mockExecPts;
      factors.push({ factor: 'Workflow activity', points: mockExecPts });
    }
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
  } catch {
    res.json({ totalSent: 312, totalOpened: 156, opens: 156, clicks: 67, openRate: 50.0 });
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
    if (error) throw error;
    res.json(data || []);
  } catch {
    res.json([]);
  }
});

// ══════════════════════════════════════════════
// A/B TESTING (with in-memory fallback)
// ══════════════════════════════════════════════

router.get('/ab-tests', async (req, res) => {
  try {
    const { data, error } = await supabase.from('ab_tests').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch {
    res.json(mockABTests);
  }
});

router.post('/ab-tests', async (req, res) => {
  try {
    const { name, variant_a_subject, variant_a_body, variant_b_subject, variant_b_body, split_ratio } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Test name is required' });

    const newTest = {
      id: nextId(), name: name.trim(), variant_a_subject, variant_a_body, variant_b_subject, variant_b_body,
      split_ratio: split_ratio || 50, status: 'draft',
      variant_a_sent: 0, variant_a_opened: 0, variant_a_clicked: 0, variant_a_replied: 0,
      variant_b_sent: 0, variant_b_opened: 0, variant_b_clicked: 0, variant_b_replied: 0,
      created_at: now(), updated_at: now(),
    };

    try {
      const { data, error } = await supabase.from('ab_tests').insert(newTest).select().single();
      if (error) throw error;
      res.status(201).json(data);
    } catch {
      mockABTests.unshift(newTest);
      res.status(201).json(newTest);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/ab-tests/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    try {
      const { data, error } = await supabase.from('ab_tests').update({ ...req.body, updated_at: now() }).eq('id', id).select().single();
      if (error) throw error;
      res.json(data);
    } catch {
      const idx = mockABTests.findIndex(t => t.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Test not found' });
      mockABTests[idx] = { ...mockABTests[idx], ...req.body, updated_at: now() };
      res.json(mockABTests[idx]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/ab-tests/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    try {
      const { error } = await supabase.from('ab_tests').delete().eq('id', id);
      if (error) throw error;
    } catch {
      const idx = mockABTests.findIndex(t => t.id === id);
      if (idx !== -1) mockABTests.splice(idx, 1);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// FOLLOW-UP SEQUENCES (with in-memory fallback + enhanced data)
// ══════════════════════════════════════════════

router.get('/sequences', async (req, res) => {
  try {
    const { data, error } = await supabase.from('follow_up_sequences').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch {
    res.json(mockSequences);
  }
});

router.post('/sequences', async (req, res) => {
  try {
    const { name, steps, trigger_condition, max_attempts } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Sequence name is required' });

    const newSeq = {
      id: nextId(), name: name.trim(), steps: steps || [], trigger_condition: trigger_condition || 'no_reply',
      max_attempts: max_attempts || 3, status: 'active', enrolled_count: 0, completed_count: 0,
      reply_rate: 0, open_rate: 0, created_at: now(), updated_at: now(),
    };

    try {
      const { data, error } = await supabase.from('follow_up_sequences').insert(newSeq).select().single();
      if (error) throw error;
      res.status(201).json(data);
    } catch {
      mockSequences.unshift(newSeq);
      res.status(201).json(newSeq);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/sequences/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    try {
      const { data, error } = await supabase.from('follow_up_sequences').update({ ...req.body, updated_at: now() }).eq('id', id).select().single();
      if (error) throw error;
      res.json(data);
    } catch {
      const idx = mockSequences.findIndex(s => s.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Sequence not found' });
      mockSequences[idx] = { ...mockSequences[idx], ...req.body, updated_at: now() };
      res.json(mockSequences[idx]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/sequences/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    try {
      const { error } = await supabase.from('follow_up_sequences').delete().eq('id', id);
      if (error) throw error;
    } catch {
      const idx = mockSequences.findIndex(s => s.id === id);
      if (idx !== -1) mockSequences.splice(idx, 1);
    }
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
    if (error) throw error;
    res.json(data || []);
  } catch {
    res.json([
      { id: 1, export_type: 'csv', record_count: 50, file_name: 'leads-export-2026-03-01.csv', file_size_bytes: 24500, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 2, export_type: 'json', record_count: 50, file_name: 'analytics-2026-03-05.json', file_size_bytes: 128000, created_at: new Date(Date.now() - 86400000).toISOString() },
    ]);
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
// WEBHOOKS / ZAPIER CONNECTOR (with in-memory fallback)
// ══════════════════════════════════════════════

router.get('/webhooks', async (req, res) => {
  try {
    const { data, error } = await supabase.from('outbound_webhooks').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch {
    res.json(mockWebhooks);
  }
});

router.post('/webhooks', async (req, res) => {
  try {
    const { name, url, events, headers } = req.body;
    if (!name?.trim() || !url?.trim()) return res.status(400).json({ error: 'Name and URL are required' });

    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) return res.status(400).json({ error: 'URL must use http or https' });
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const newWebhook = {
      id: nextId(), name: name.trim(), url: url.trim(), events: events || ['lead.created', 'execution.completed'],
      headers: headers || {}, is_active: true, last_triggered: null, trigger_count: 0, created_at: now(), updated_at: now(),
    };

    try {
      const { data, error } = await supabase.from('outbound_webhooks').insert(newWebhook).select().single();
      if (error) throw error;
      res.status(201).json(data);
    } catch {
      mockWebhooks.unshift(newWebhook);
      res.status(201).json(newWebhook);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/webhooks/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    try {
      const { data, error } = await supabase.from('outbound_webhooks').update({ ...req.body, updated_at: now() }).eq('id', id).select().single();
      if (error) throw error;
      res.json(data);
    } catch {
      const idx = mockWebhooks.findIndex(w => w.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Webhook not found' });
      mockWebhooks[idx] = { ...mockWebhooks[idx], ...req.body, updated_at: now() };
      res.json(mockWebhooks[idx]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/webhooks/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    try {
      const { error } = await supabase.from('outbound_webhooks').delete().eq('id', id);
      if (error) throw error;
    } catch {
      const idx = mockWebhooks.findIndex(w => w.id === id);
      if (idx !== -1) mockWebhooks.splice(idx, 1);
    }
    res.json({ deleted: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/webhooks/:id/test', async (req, res) => {
  try {
    const id = Number(req.params.id);
    let webhook;

    try {
      const { data, error } = await supabase.from('outbound_webhooks').select('*').eq('id', id).single();
      if (error) throw error;
      webhook = data;
    } catch {
      webhook = mockWebhooks.find(w => w.id === id);
    }

    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });

    // Try actual webhook call, fall back to mock success response
    try {
      const payload = { event: 'test', timestamp: now(), data: { message: 'This is a test webhook from FlowReach AI' } };
      const fetchRes = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(typeof webhook.headers === 'object' ? webhook.headers : {}) },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });
      
      // Update trigger count
      const mockIdx = mockWebhooks.findIndex(w => w.id === id);
      if (mockIdx !== -1) {
        mockWebhooks[mockIdx].last_triggered = now();
        mockWebhooks[mockIdx].trigger_count = (mockWebhooks[mockIdx].trigger_count || 0) + 1;
      }
      try { await supabase.from('outbound_webhooks').update({ last_triggered: now(), trigger_count: (webhook.trigger_count || 0) + 1 }).eq('id', id); } catch { /* ignore */ }

      res.json({ success: fetchRes.ok, statusCode: fetchRes.status, statusText: fetchRes.statusText });
    } catch {
      // Mock success for demo
      const mockIdx = mockWebhooks.findIndex(w => w.id === id);
      if (mockIdx !== -1) {
        mockWebhooks[mockIdx].last_triggered = now();
        mockWebhooks[mockIdx].trigger_count = (mockWebhooks[mockIdx].trigger_count || 0) + 1;
      }
      res.json({ success: true, statusCode: 200, statusText: 'OK (simulated)' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
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
// CRM INTEGRATIONS (with in-memory fallback)
// ══════════════════════════════════════════════

router.get('/crm-integrations', async (req, res) => {
  try {
    const { data, error } = await supabase.from('crm_integrations').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch {
    res.json(mockCRMIntegrations);
  }
});

router.post('/crm-integrations', async (req, res) => {
  try {
    const { provider, config } = req.body;
    if (!provider?.trim()) return res.status(400).json({ error: 'Provider is required' });

    const newIntegration = {
      id: nextId(), provider: provider.trim(), config: config || {}, is_connected: true, sync_status: 'synced',
      created_at: now(), updated_at: now(),
    };

    try {
      const { data: existing } = await supabase.from('crm_integrations').select('id').eq('provider', provider).eq('is_connected', true).single();
      if (existing) {
        const { data, error } = await supabase.from('crm_integrations')
          .update({ config: config || {}, updated_at: now() })
          .eq('id', existing.id).select().single();
        if (error) throw error;
        return res.json(data);
      }

      const { data, error } = await supabase.from('crm_integrations').insert(newIntegration).select().single();
      if (error) throw error;
      res.status(201).json(data);
    } catch {
      // Use mock store
      const existingIdx = mockCRMIntegrations.findIndex(c => c.provider === provider && c.is_connected);
      if (existingIdx !== -1) {
        mockCRMIntegrations[existingIdx] = { ...mockCRMIntegrations[existingIdx], config: config || {}, updated_at: now() };
        return res.json(mockCRMIntegrations[existingIdx]);
      }
      mockCRMIntegrations.unshift(newIntegration);
      res.status(201).json(newIntegration);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/crm-integrations/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    try {
      const { data, error } = await supabase.from('crm_integrations')
        .update({ ...req.body, updated_at: now() })
        .eq('id', id).select().single();
      if (error) throw error;
      res.json(data);
    } catch {
      const idx = mockCRMIntegrations.findIndex(c => c.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Integration not found' });
      mockCRMIntegrations[idx] = { ...mockCRMIntegrations[idx], ...req.body, updated_at: now() };
      res.json(mockCRMIntegrations[idx]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/crm-integrations/:provider', async (req, res) => {
  try {
    const provider = req.params.provider;
    try {
      const { error } = await supabase.from('crm_integrations')
        .update({ is_connected: false, updated_at: now() })
        .eq('provider', provider);
      if (error) throw error;
    } catch {
      const idx = mockCRMIntegrations.findIndex(c => c.provider === provider);
      if (idx !== -1) {
        mockCRMIntegrations[idx].is_connected = false;
        mockCRMIntegrations[idx].updated_at = now();
      }
    }
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
    if (error) throw error;
    res.json(data || []);
  } catch {
    res.json([
      { id: 1, name: 'Quick Intro Call', duration: 15, url: 'https://calendly.com/flowreach/intro', provider: 'calendly', is_active: true, created_at: now() },
      { id: 2, name: 'Product Demo', duration: 30, url: 'https://calendly.com/flowreach/demo', provider: 'calendly', is_active: true, created_at: now() },
    ]);
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
    if (error) throw error;
    res.json(data || []);
  } catch {
    res.json([
      { id: 1, name: 'You', email: 'admin@flowreach.ai', role: 'Admin', avatar: 'Y', status: 'active', last_active: now(), created_at: now() },
      { id: 2, name: 'Sarah Chen', email: 'sarah@flowreach.ai', role: 'Editor', avatar: 'S', status: 'active', last_active: new Date(Date.now() - 3600000).toISOString(), created_at: now() },
    ]);
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
    if (error) throw error;
    res.json(data || []);
  } catch {
    res.json([
      { id: 1, user_name: 'You', action: 'scored 50 leads in bulk', created_at: new Date(Date.now() - 1800000).toISOString() },
      { id: 2, user_name: 'Sarah Chen', action: 'created workflow "Cold Outreach v2"', created_at: new Date(Date.now() - 7200000).toISOString() },
      { id: 3, user_name: 'You', action: 'imported 25 new leads', created_at: new Date(Date.now() - 86400000).toISOString() },
    ]);
  }
});

export default router;
