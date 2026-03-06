import { Router } from 'express';
import supabase from '../db.js';
import { generateMessage } from '../ai.js';

const router = Router();

// In-memory call log (persists during server session)
const callLog = [];

// Helper: generate a realistic demo phone number from lead id
function demoPhone(leadId) {
  const base = 9100000000 + (leadId * 7919) % 900000000;
  return `+91${base}`;
}

// ─── AUTO-CALL LEADS ────────────────────────────
// POST /api/calls/auto — Automatically call leads
router.post('/auto', async (req, res) => {
  try {
    const { message, status_filter, limit: reqLimit } = req.body;
    const callLimit = reqLimit || 5;

    // Fetch leads
    let query = supabase.from('leads').select('*');

    if (status_filter) {
      query = query.eq('status', status_filter);
    }

    const { data: leads, error } = await query
      .order('created_at', { ascending: false })
      .limit(callLimit);

    if (error) return res.status(500).json({ error: error.message });

    if (!leads || leads.length === 0) {
      return res.json({ success: true, message: 'No leads found', calls: [], total: 0 });
    }

    const callResults = [];

    for (const lead of leads) {
      const phone = demoPhone(lead.id);

      // Generate call script
      let callScript;
      if (message) {
        callScript = message
          .replace(/\{\{name\}\}/g, lead.name)
          .replace(/\{\{company\}\}/g, lead.company || 'your company')
          .replace(/\{\{email\}\}/g, lead.email)
          .replace(/\{\{title\}\}/g, lead.title || '');
      } else {
        try {
          const aiResult = await generateMessage({
            lead,
            prompt: `Write a brief, warm 30-second phone call script for reaching out to {{name}} at {{company}}. Introduce FlowReach AI, mention how we can help their business, and end with a call-to-action to check their email. Keep it natural and conversational, under 100 words.`,
            tone: 'professional',
            maxLength: 150,
          });
          callScript = aiResult.body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        } catch {
          callScript = `Hello ${lead.name}! This is an automated call from FlowReach AI. We noticed ${lead.company || 'your company'} could benefit from our AI-powered outreach automation. We'd love to connect and discuss how we can help streamline your sales pipeline. Please check your email for more details. Thank you and have a great day!`;
        }
      }

      // Track in memory
      callLog.push({
        leadId: lead.id,
        name: lead.name,
        phone: phone,
        company: lead.company,
        script: callScript,
        status: 'completed',
        timestamp: new Date().toISOString(),
      });

      // Try to save to DB (may fail due to constraints, that's ok)
      try {
        await supabase.from('messages').insert({
          lead_id: lead.id,
          type: 'email',
          channel: 'call',
          subject: `Auto-call to ${lead.name} (${phone})`,
          body: callScript,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });
      } catch (e) { /* DB constraint - ignore */ }

      // Update lead status
      await supabase
        .from('leads')
        .update({ status: 'contacted', updated_at: new Date().toISOString() })
        .eq('id', lead.id);

      callResults.push({
        leadId: lead.id,
        name: lead.name,
        phone: phone,
        company: lead.company,
        script: callScript,
        status: 'completed',
        callRecord: null,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: `Auto-called ${callResults.length} leads`,
      calls: callResults,
      total: callResults.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET CALL HISTORY ───────────────────────────
router.get('/history', async (req, res) => {
  try {
    // Return in-memory call log (most recent first)
    const history = [...callLog].reverse().slice(0, 50);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CALL SINGLE LEAD ───────────────────────────
router.post('/:leadId', async (req, res) => {
  try {
    const leadId = Number(req.params.leadId);
    const { message } = req.body;

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) return res.status(404).json({ error: 'Lead not found' });

    const phone = demoPhone(lead.id);

    let callScript;
    if (message) {
      callScript = message
        .replace(/\{\{name\}\}/g, lead.name)
        .replace(/\{\{company\}\}/g, lead.company || 'your company')
        .replace(/\{\{email\}\}/g, lead.email);
    } else {
      callScript = `Hello ${lead.name}, this is FlowReach AI calling on behalf of ${lead.company || 'your organization'}. We'd love to connect and help automate your outreach!`;
    }

    const { data: callRecord } = await supabase
      .from('messages')
      .insert({
        lead_id: lead.id,
        type: 'email',
        channel: 'call',
        subject: `Call to ${lead.name} (${phone})`,
        body: callScript,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    await supabase
      .from('leads')
      .update({ status: 'contacted', updated_at: new Date().toISOString() })
      .eq('id', lead.id);

    res.json({
      success: true,
      lead: { id: lead.id, name: lead.name, phone },
      script: callScript,
      callRecord,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET CALL STATS ─────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    res.json({
      totalCalls: callLog.length,
      sentCalls: callLog.filter(c => c.status === 'completed').length,
      totalLeads: totalLeads || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
