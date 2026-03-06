import { Router } from 'express';
import supabase from '../db.js';

const router = Router();

// ─── BLACKLIST CRUD ────────────────────────────

// GET /api/settings/blacklist — List all blacklisted emails/domains
router.get('/blacklist', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blacklist')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/blacklist — Add email/domain to blacklist
router.post('/blacklist', async (req, res) => {
  try {
    const { email, reason } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ error: 'Email or domain is required' });
    }

    // Check if already exists
    const { data: existing } = await supabase
      .from('blacklist')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Already blacklisted' });
    }

    const { data, error } = await supabase
      .from('blacklist')
      .insert({ email: email.trim().toLowerCase(), reason: reason || null })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/settings/blacklist/:id — Remove from blacklist
router.delete('/blacklist/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('blacklist')
      .delete()
      .eq('id', Number(req.params.id));
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DAILY SEND STATS ──────────────────────────

// GET /api/settings/daily-stats — Get today's send count and limit
router.get('/daily-stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_send_counts')
      .select('*')
      .eq('date', today)
      .maybeSingle();

    const dailyLimit = Number.parseInt(process.env.DAILY_SEND_LIMIT || '50', 10);

    res.json({
      date: today,
      sent: data?.count || 0,
      limit: dailyLimit,
      remaining: Math.max(0, dailyLimit - (data?.count || 0)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/daily-stats/history — Last 7 days send history
router.get('/daily-stats/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('daily_send_counts')
      .select('*')
      .order('date', { ascending: false })
      .limit(7);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/daily-stats/reset — Reset today's count
router.post('/daily-stats/reset', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('daily_send_counts')
      .upsert({ date: today, count: 0 }, { onConflict: 'date' });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, date: today, count: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SAFETY SCORE ───────────────────────────────

// GET /api/settings/safety-score — Calculate overall safety score
router.get('/safety-score', async (req, res) => {
  try {
    let score = 0;
    const checks = [];

    // 1. Has SMTP configured? (20 pts)
    const { data: smtpCreds } = await supabase
      .from('credentials')
      .select('id')
      .eq('type', 'smtp')
      .limit(1);
    const hasSMTP = smtpCreds && smtpCreds.length > 0;
    if (hasSMTP) score += 20;
    checks.push({ name: 'SMTP Configured', passed: hasSMTP, points: 20 });

    // 2. Has AI provider key? (20 pts)
    const { data: aiCreds } = await supabase
      .from('credentials')
      .select('id')
      .in('type', ['groq', 'openai', 'anthropic', 'google'])
      .limit(1);
    const hasAIKey = (aiCreds && aiCreds.length > 0) || !!process.env.GROQ_API_KEY;
    if (hasAIKey) score += 20;
    checks.push({ name: 'AI Provider Configured', passed: hasAIKey, points: 20 });

    // 3. Blacklist has entries? (15 pts)
    const { count: blacklistCount } = await supabase
      .from('blacklist')
      .select('*', { count: 'exact', head: true });
    const hasBlacklist = (blacklistCount || 0) > 0;
    if (hasBlacklist) score += 15;
    checks.push({ name: 'Blacklist Active', passed: hasBlacklist, points: 15, detail: `${blacklistCount || 0} entries` });

    // 4. Daily send limit is reasonable (< 200)? (15 pts)
    const dailyLimit = Number.parseInt(process.env.DAILY_SEND_LIMIT || '50', 10);
    const reasonableLimit = dailyLimit <= 200;
    if (reasonableLimit) score += 15;
    checks.push({ name: 'Daily Limit Set', passed: reasonableLimit, points: 15, detail: `${dailyLimit}/day` });

    // 5. Has at least 1 workflow? (10 pts)
    const { count: wfCount } = await supabase
      .from('workflows')
      .select('*', { count: 'exact', head: true });
    const hasWorkflows = (wfCount || 0) > 0;
    if (hasWorkflows) score += 10;
    checks.push({ name: 'Workflows Created', passed: hasWorkflows, points: 10, detail: `${wfCount || 0} workflows` });

    // 6. Has leads imported? (10 pts)
    const { count: leadCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });
    const hasLeads = (leadCount || 0) > 0;
    if (hasLeads) score += 10;
    checks.push({ name: 'Leads Imported', passed: hasLeads, points: 10, detail: `${leadCount || 0} leads` });

    // 7. Sent emails today within limit? (10 pts)
    const today = new Date().toISOString().split('T')[0];
    const { data: dailyData } = await supabase
      .from('daily_send_counts')
      .select('count')
      .eq('date', today)
      .maybeSingle();
    const todaySent = dailyData?.count || 0;
    const withinLimit = todaySent < dailyLimit;
    if (withinLimit) score += 10;
    checks.push({ name: 'Within Daily Limit', passed: withinLimit, points: 10, detail: `${todaySent}/${dailyLimit} sent today` });

    res.json({ score, maxScore: 100, checks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
