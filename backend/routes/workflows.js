import { Router } from 'express';
import supabase from '../db.js';
import { safeJsonParse } from '../utils.js';

const router = Router();

// GET /api/workflows — List all workflows
router.get('/', async (req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from('workflows')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const workflows = (rows || []).map(w => ({
      ...w,
      nodes: safeJsonParse(w.nodes, []),
      edges: safeJsonParse(w.edges, []),
      is_active: Boolean(w.is_active)
    }));
    res.json({ workflows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workflows/:id — Single workflow
router.get('/:id', async (req, res) => {
  try {
    const { data: row, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', Number(req.params.id))
      .single();

    if (error || !row) return res.status(404).json({ error: 'Workflow not found' });

    res.json({
      ...row,
      nodes: safeJsonParse(row.nodes, []),
      edges: safeJsonParse(row.edges, []),
      is_active: Boolean(row.is_active)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workflows — Create workflow
router.post('/', async (req, res) => {
  try {
    const { name, description, nodes, edges } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Workflow name is required' });
    }

    const { data: created, error } = await supabase
      .from('workflows')
      .insert({
        name: name.trim(),
        description: description || '',
        nodes: JSON.stringify(nodes || []),
        edges: JSON.stringify(edges || [])
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({
      ...created,
      nodes: safeJsonParse(created.nodes, []),
      edges: safeJsonParse(created.edges, []),
      is_active: Boolean(created.is_active)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/workflows/:id — Update workflow
router.put('/:id', async (req, res) => {
  try {
    const { name, description, nodes, edges, is_active } = req.body;
    const id = Number(req.params.id);

    const { data: existing, error: fetchErr } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) return res.status(404).json({ error: 'Workflow not found' });

    const activeValue = is_active === undefined ? existing.is_active : Boolean(is_active);

    const { data: updated, error } = await supabase
      .from('workflows')
      .update({
        name: name ?? existing.name,
        description: description ?? existing.description,
        nodes: nodes ? JSON.stringify(nodes) : existing.nodes,
        edges: edges ? JSON.stringify(edges) : existing.edges,
        is_active: activeValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      ...updated,
      nodes: safeJsonParse(updated.nodes, []),
      edges: safeJsonParse(updated.edges, []),
      is_active: Boolean(updated.is_active)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/workflows/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    const { data: existing, error: fetchErr } = await supabase
      .from('workflows')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) return res.status(404).json({ error: 'Workflow not found' });

    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ deleted: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workflows/seed-templates — Seed workflow templates
router.post('/seed-templates', async (req, res) => {
  try {
    const templates = [
      {
        name: 'Cold Outreach Sequence',
        description: 'Automated cold email sequence with AI-generated personalization and follow-ups',
        nodes: JSON.stringify([
          { id: 'start-1', type: 'startNode', position: { x: 250, y: 50 }, data: { label: 'Start', trigger: 'manual' } },
          { id: 'ai-1', type: 'aiGenerateNode', position: { x: 250, y: 180 }, data: { label: 'Generate Cold Email', prompt: 'Write a personalized cold outreach email to {{name}} at {{company}}. They are a {{title}}. Be professional, concise, and mention a specific value proposition.', tone: 'professional', maxLength: 200 } },
          { id: 'email-1', type: 'emailNode', position: { x: 250, y: 320 }, data: { label: 'Send Cold Email', subject: 'Quick question about {{company}}', fromName: 'FlowReach AI' } },
          { id: 'delay-1', type: 'delayNode', position: { x: 250, y: 460 }, data: { label: 'Wait 3 Days', duration: 3, unit: 'days' } },
          { id: 'condition-1', type: 'conditionNode', position: { x: 250, y: 600 }, data: { label: 'Replied?', field: 'status', operator: 'equals', value: 'replied' } },
          { id: 'update-1', type: 'updateLeadNode', position: { x: 500, y: 740 }, data: { label: 'Mark Converted', status: 'converted' } },
          { id: 'ai-2', type: 'aiGenerateNode', position: { x: 50, y: 740 }, data: { label: 'Generate Follow-up', prompt: 'Write a polite follow-up email to {{name}} at {{company}}. Reference the initial outreach and add urgency.', tone: 'friendly', maxLength: 150 } },
          { id: 'email-2', type: 'emailNode', position: { x: 50, y: 880 }, data: { label: 'Send Follow-up', subject: 'Following up — {{company}}', fromName: 'FlowReach AI' } },
          { id: 'end-1', type: 'endNode', position: { x: 250, y: 1020 }, data: { label: 'End' } }
        ]),
        edges: JSON.stringify([
          { id: 'e-start-ai1', source: 'start-1', target: 'ai-1' },
          { id: 'e-ai1-email1', source: 'ai-1', target: 'email-1' },
          { id: 'e-email1-delay1', source: 'email-1', target: 'delay-1' },
          { id: 'e-delay1-cond1', source: 'delay-1', target: 'condition-1' },
          { id: 'e-cond1-update1', source: 'condition-1', target: 'update-1', sourceHandle: 'yes', label: 'Yes' },
          { id: 'e-cond1-ai2', source: 'condition-1', target: 'ai-2', sourceHandle: 'no', label: 'No' },
          { id: 'e-ai2-email2', source: 'ai-2', target: 'email-2' },
          { id: 'e-email2-end', source: 'email-2', target: 'end-1' },
          { id: 'e-update1-end', source: 'update-1', target: 'end-1' }
        ])
      },
      {
        name: 'Lead Nurture Drip',
        description: 'Multi-touch nurture sequence for warm leads with conditional branching',
        nodes: JSON.stringify([
          { id: 'start-1', type: 'startNode', position: { x: 250, y: 50 }, data: { label: 'Start', trigger: 'manual' } },
          { id: 'ai-1', type: 'aiGenerateNode', position: { x: 250, y: 180 }, data: { label: 'Welcome Email', prompt: 'Write a warm welcome email to {{name}} from {{company}}. Introduce our product and its key benefits for a {{title}}.', tone: 'friendly', maxLength: 200 } },
          { id: 'email-1', type: 'emailNode', position: { x: 250, y: 320 }, data: { label: 'Send Welcome', subject: 'Welcome to FlowReach, {{name}}!', fromName: 'FlowReach Team' } },
          { id: 'delay-1', type: 'delayNode', position: { x: 250, y: 460 }, data: { label: 'Wait 2 Days', duration: 2, unit: 'days' } },
          { id: 'update-1', type: 'updateLeadNode', position: { x: 250, y: 600 }, data: { label: 'Mark Contacted', status: 'contacted' } },
          { id: 'end-1', type: 'endNode', position: { x: 250, y: 740 }, data: { label: 'End' } }
        ]),
        edges: JSON.stringify([
          { id: 'e-start-ai1', source: 'start-1', target: 'ai-1' },
          { id: 'e-ai1-email1', source: 'ai-1', target: 'email-1' },
          { id: 'e-email1-delay1', source: 'email-1', target: 'delay-1' },
          { id: 'e-delay1-update1', source: 'delay-1', target: 'update-1' },
          { id: 'e-update1-end', source: 'update-1', target: 'end-1' }
        ])
      },
      {
        name: 'Re-engagement Campaign',
        description: 'Win-back campaign for leads that went cold with AI-powered personalization',
        nodes: JSON.stringify([
          { id: 'start-1', type: 'startNode', position: { x: 250, y: 50 }, data: { label: 'Start', trigger: 'manual' } },
          { id: 'condition-1', type: 'conditionNode', position: { x: 250, y: 180 }, data: { label: 'Is Bounced?', field: 'status', operator: 'equals', value: 'bounced' } },
          { id: 'update-1', type: 'updateLeadNode', position: { x: 500, y: 320 }, data: { label: 'Mark Unsubscribed', status: 'unsubscribed' } },
          { id: 'ai-1', type: 'aiGenerateNode', position: { x: 50, y: 320 }, data: { label: 'Win-back Email', prompt: 'Write a re-engagement email to {{name}} at {{company}}. We haven\'t heard from them in a while. Offer something valuable to restart the conversation.', tone: 'casual', maxLength: 180 } },
          { id: 'email-1', type: 'emailNode', position: { x: 50, y: 460 }, data: { label: 'Send Win-back', subject: 'We miss you at {{company}}!', fromName: 'FlowReach AI' } },
          { id: 'delay-1', type: 'delayNode', position: { x: 50, y: 600 }, data: { label: 'Wait 5 Days', duration: 5, unit: 'days' } },
          { id: 'update-2', type: 'updateLeadNode', position: { x: 50, y: 740 }, data: { label: 'Mark Contacted', status: 'contacted' } },
          { id: 'end-1', type: 'endNode', position: { x: 250, y: 880 }, data: { label: 'End' } }
        ]),
        edges: JSON.stringify([
          { id: 'e-start-cond1', source: 'start-1', target: 'condition-1' },
          { id: 'e-cond1-update1', source: 'condition-1', target: 'update-1', sourceHandle: 'yes', label: 'Yes' },
          { id: 'e-cond1-ai1', source: 'condition-1', target: 'ai-1', sourceHandle: 'no', label: 'No' },
          { id: 'e-ai1-email1', source: 'ai-1', target: 'email-1' },
          { id: 'e-email1-delay1', source: 'email-1', target: 'delay-1' },
          { id: 'e-delay1-update2', source: 'delay-1', target: 'update-2' },
          { id: 'e-update2-end', source: 'update-2', target: 'end-1' },
          { id: 'e-update1-end', source: 'update-1', target: 'end-1' }
        ])
      },
      {
        name: 'AI-Powered Lead Scoring',
        description: 'Classify and score leads with AI Agent, then route to appropriate channels',
        nodes: JSON.stringify([
          { id: 'webhook-1', type: 'webhookNode', position: { x: 300, y: 50 }, data: { label: 'New Lead Hook', path: 'incoming-lead', httpMethod: 'POST', responseMessage: 'Lead received' } },
          { id: 'ai-agent-1', type: 'aiAgentNode', position: { x: 300, y: 200 }, data: { label: 'Score Lead', provider: 'groq', model: 'llama-3.3-70b-versatile', systemPrompt: 'You are a lead scoring expert. Classify leads as hot, warm, or cold.', userPrompt: 'Score this lead: {{name}}, {{title}} at {{company}}', temperature: 0.3, maxTokens: 256 } },
          { id: 'classifier-1', type: 'classifierNode', position: { x: 300, y: 370 }, data: { label: 'Classify', categories: ['hot_lead', 'warm_lead', 'cold_lead'], classifyPrompt: 'Classify based on AI score output' } },
          { id: 'filter-1', type: 'filterNode', position: { x: 300, y: 530 }, data: { label: 'Hot Leads Only', filterField: 'status', filterOp: 'equals', filterValue: 'new' } },
          { id: 'slack-1', type: 'slackNode', position: { x: 100, y: 680 }, data: { label: 'Alert Sales', channel: 'sales-alerts', message: 'Hot lead! {{name}} ({{title}}) at {{company}}' } },
          { id: 'email-1', type: 'emailNode', position: { x: 500, y: 680 }, data: { label: 'Send Welcome', subject: 'Welcome {{name}}!', fromName: 'FlowReach AI' } },
          { id: 'update-1', type: 'updateLeadNode', position: { x: 300, y: 830 }, data: { label: 'Mark Contacted', status: 'contacted' } },
          { id: 'end-1', type: 'endNode', position: { x: 300, y: 960 }, data: { label: 'End' } }
        ]),
        edges: JSON.stringify([
          { id: 'e1', source: 'webhook-1', target: 'ai-agent-1' },
          { id: 'e2', source: 'ai-agent-1', target: 'classifier-1' },
          { id: 'e3', source: 'classifier-1', target: 'filter-1' },
          { id: 'e4', source: 'filter-1', target: 'slack-1', sourceHandle: 'match', label: 'Match' },
          { id: 'e5', source: 'filter-1', target: 'email-1', sourceHandle: 'no-match', label: 'No Match' },
          { id: 'e6', source: 'slack-1', target: 'update-1' },
          { id: 'e7', source: 'email-1', target: 'update-1' },
          { id: 'e8', source: 'update-1', target: 'end-1' }
        ])
      },
      {
        name: 'Multi-Channel Outreach',
        description: 'A/B test email vs SMS outreach with AI content generation and scheduling',
        nodes: JSON.stringify([
          { id: 'schedule-1', type: 'scheduleNode', position: { x: 300, y: 50 }, data: { label: 'Daily 9am', interval: 'daily', time: '09:00' } },
          { id: 'ai-agent-1', type: 'aiAgentNode', position: { x: 300, y: 200 }, data: { label: 'Generate Content', provider: 'groq', model: 'llama-3.3-70b-versatile', systemPrompt: 'Generate short, compelling outreach messages.', userPrompt: 'Create a brief outreach message for {{name}} at {{company}}.', temperature: 0.7, maxTokens: 512 } },
          { id: 'split-1', type: 'splitNode', position: { x: 300, y: 370 }, data: { label: 'A/B Split', splitMode: 'percentage', percentage: 60 } },
          { id: 'email-1', type: 'emailNode', position: { x: 100, y: 530 }, data: { label: 'Email (60%)', subject: 'Quick thought for {{company}}', fromName: 'FlowReach AI' } },
          { id: 'sms-1', type: 'smsNode', position: { x: 500, y: 530 }, data: { label: 'SMS (40%)', to: '{{phone}}', smsMessage: 'Hi {{name}}, quick note about {{company}}...' } },
          { id: 'delay-1', type: 'delayNode', position: { x: 100, y: 680 }, data: { label: 'Wait 2 Days', duration: 2, unit: 'days' } },
          { id: 'delay-2', type: 'delayNode', position: { x: 500, y: 680 }, data: { label: 'Wait 1 Day', duration: 1, unit: 'days' } },
          { id: 'merge-1', type: 'mergeNode', position: { x: 300, y: 830 }, data: { label: 'Merge Results', mode: 'append' } },
          { id: 'update-1', type: 'updateLeadNode', position: { x: 300, y: 960 }, data: { label: 'Mark Contacted', status: 'contacted' } },
          { id: 'end-1', type: 'endNode', position: { x: 300, y: 1090 }, data: { label: 'End' } }
        ]),
        edges: JSON.stringify([
          { id: 'e1', source: 'schedule-1', target: 'ai-agent-1' },
          { id: 'e2', source: 'ai-agent-1', target: 'split-1' },
          { id: 'e3', source: 'split-1', target: 'email-1', sourceHandle: 'out-a', label: 'A (60%)' },
          { id: 'e4', source: 'split-1', target: 'sms-1', sourceHandle: 'out-b', label: 'B (40%)' },
          { id: 'e5', source: 'email-1', target: 'delay-1' },
          { id: 'e6', source: 'sms-1', target: 'delay-2' },
          { id: 'e7', source: 'delay-1', target: 'merge-1', targetHandle: 'input-a' },
          { id: 'e8', source: 'delay-2', target: 'merge-1', targetHandle: 'input-b' },
          { id: 'e9', source: 'merge-1', target: 'update-1' },
          { id: 'e10', source: 'update-1', target: 'end-1' }
        ])
      }
    ];

    const seeded = [];
    for (const t of templates) {
      // Check if template already exists
      const { data: existing } = await supabase
        .from('workflows')
        .select('id')
        .eq('name', t.name)
        .single();

      if (!existing) {
        const { data: created, error } = await supabase
          .from('workflows')
          .insert({ name: t.name, description: t.description, nodes: t.nodes, edges: t.edges })
          .select('id, name')
          .single();

        if (!error && created) {
          seeded.push(created);
        }
      }
    }

    res.json({ message: `Seeded ${seeded.length} workflow templates`, templates: seeded });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
