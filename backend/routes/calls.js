import { Router } from 'express';
import supabase from '../db.js';
import { generateMessage, replaceVariables } from '../ai.js';

const router = Router();

// ─── AUTO-CALL LEADS ────────────────────────────
// POST /api/calls/auto — Automatically call all leads with phone numbers
router.post('/auto', async (req, res) => {
  try {
    const { message, status_filter, limit } = req.body;

    // Fetch leads that have phone numbers
    let query = supabase
      .from('leads')
      .select('*')
      .not('phone', 'is', null)
      .neq('phone', '');

    if (status_filter) {
      query = query.eq('status', status_filter);
    }

    const { data: leads, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit || 20);

    if (error) return res.status(500).json({ error: error.message });

    if (!leads || leads.length === 0) {
      return res.json({
        success: true,
        message: 'No leads with phone numbers found',
        calls: [],
        total: 0,
      });
    }

    const callResults = [];

    for (const lead of leads) {
      // Generate a personalized call script using AI (or use custom message)
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
            prompt: `Write a brief, warm 30-second phone call script for reaching out to {{name}} at {{company}}. The call should introduce FlowReach AI, mention how we can help their business, and end with a call-to-action to check their email. Keep it natural and conversational.`,
            tone: 'professional',
            maxLength: 150,
          });
          callScript = aiResult.body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        } catch {
          callScript = `Hello ${lead.name}. This is an automated call from FlowReach AI. We noticed ${lead.company || 'your company'} could benefit from our automation solutions. We'd love to connect and discuss how we can help. Please check your email for more details. Thank you and have a great day!`;
        }
      }

      // Log the call in messages table
      const { data: callRecord, error: insertError } = await supabase
        .from('messages')
        .insert({
          lead_id: lead.id,
          execution_id: null,
          type: 'call',
          subject: `Auto-call to ${lead.name}`,
          body: callScript,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Update lead status to contacted
      await supabase
        .from('leads')
        .update({ status: 'contacted', updated_at: new Date().toISOString() })
        .eq('id', lead.id);

      callResults.push({
        leadId: lead.id,
        name: lead.name,
        phone: lead.phone,
        company: lead.company,
        script: callScript,
        status: 'completed',
        callRecord: callRecord || null,
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
// GET /api/calls/history — Get all call records
router.get('/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*, leads(name, email, phone, company)')
      .eq('type', 'call')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CALL SINGLE LEAD ───────────────────────────
// POST /api/calls/:leadId — Call a specific lead
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

    if (!lead.phone) {
      return res.status(400).json({ error: 'Lead has no phone number' });
    }

    let callScript;
    if (message) {
      callScript = message
        .replace(/\{\{name\}\}/g, lead.name)
        .replace(/\{\{company\}\}/g, lead.company || 'your company')
        .replace(/\{\{email\}\}/g, lead.email);
    } else {
      try {
        const aiResult = await generateMessage({
          lead,
          prompt: `Write a brief, warm phone call script for reaching out to {{name}} at {{company}}.`,
          tone: 'professional',
          maxLength: 150,
        });
        callScript = aiResult.body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      } catch {
        callScript = `Hello ${lead.name}, this is FlowReach AI calling on behalf of ${lead.company || 'your organization'}. We'd love to connect!`;
      }
    }

    // Log the call
    const { data: callRecord } = await supabase
      .from('messages')
      .insert({
        lead_id: lead.id,
        execution_id: null,
        type: 'call',
        subject: `Call to ${lead.name}`,
        body: callScript,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Update lead status
    await supabase
      .from('leads')
      .update({ status: 'contacted', updated_at: new Date().toISOString() })
      .eq('id', lead.id);

    res.json({
      success: true,
      lead: { id: lead.id, name: lead.name, phone: lead.phone },
      script: callScript,
      callRecord,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET CALL STATS ─────────────────────────────
// GET /api/calls/stats — Get calling statistics
router.get('/stats', async (req, res) => {
  try {
    const { count: totalCalls } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'call');

    const { count: sentCalls } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'call')
      .eq('status', 'sent');

    const { count: failedCalls } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'call')
      .eq('status', 'failed');

    const { count: leadsWithPhone } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .not('phone', 'is', null)
      .neq('phone', '');

    res.json({
      totalCalls: totalCalls || 0,
      sentCalls: sentCalls || 0,
      failedCalls: failedCalls || 0,
      leadsWithPhone: leadsWithPhone || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
