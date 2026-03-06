import { Router } from 'express';
import supabase from '../db.js';
import { generateMessage, previewMessages } from '../ai.js';
import Groq from 'groq-sdk';

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

// POST /api/ai/chat — Direct AI chat conversation
router.post('/chat', async (req, res) => {
  try {
    const { message, context, model } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.json({
        reply: `I'd be happy to help! You asked: "${message}"\n\nHere are some things I can help you with:\n• Generate personalized outreach emails\n• Create workflow automation strategies\n• Analyze lead data and suggest approaches\n• Write follow-up sequences\n\n(Note: Set GROQ_API_KEY for full AI responses)`,
        source: 'mock',
      });
    }

    const groq = new Groq({ apiKey });
    const systemPrompt = `You are FlowReach AI, an intelligent assistant for a lead outreach automation platform. You help users with:
- Writing personalized outreach emails and sequences
- Creating workflow automation strategies
- Analyzing lead engagement and suggesting improvements
- Generating email templates for different tones and industries
- Providing marketing and sales best practices

${context ? `Context: ${context}` : ''}

Be helpful, concise, and actionable. If the user asks for emails, provide actual email content. If they ask about workflows, describe step-by-step automation flows.`;

    const completion = await groq.chat.completions.create({
      model: model || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });

    const reply = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    res.json({ reply, source: 'groq', model: model || 'llama-3.3-70b-versatile' });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/create-workflow — AI generates a workflow from natural language
router.post('/create-workflow', async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'Description is required' });

    const apiKey = process.env.GROQ_API_KEY;

    let nodes, edges, name;

    if (!apiKey) {
      // Mock: return a simple workflow
      name = 'AI-Generated: ' + description.substring(0, 40);
      nodes = [
        { id: 'start-1', type: 'startNode', position: { x: 250, y: 50 }, data: { label: 'Start', trigger: 'manual' } },
        { id: 'ai-1', type: 'aiGenerateNode', position: { x: 250, y: 200 }, data: { label: 'AI Generate', prompt: `Based on: ${description}. Write a personalized email to {{name}} at {{company}}.`, tone: 'professional', maxLength: 200 } },
        { id: 'email-1', type: 'emailNode', position: { x: 250, y: 350 }, data: { label: 'Send Email', subject: 'Hello {{name}}', fromName: 'FlowReach AI' } },
        { id: 'delay-1', type: 'delayNode', position: { x: 250, y: 500 }, data: { label: 'Wait 2 Days', duration: 2, unit: 'days' } },
        { id: 'update-1', type: 'updateLeadNode', position: { x: 250, y: 650 }, data: { label: 'Mark Contacted', status: 'contacted' } },
        { id: 'end-1', type: 'endNode', position: { x: 250, y: 800 }, data: { label: 'End' } },
      ];
      edges = [
        { id: 'e1', source: 'start-1', target: 'ai-1' },
        { id: 'e2', source: 'ai-1', target: 'email-1' },
        { id: 'e3', source: 'email-1', target: 'delay-1' },
        { id: 'e4', source: 'delay-1', target: 'update-1' },
        { id: 'e5', source: 'update-1', target: 'end-1' },
      ];
    } else {
      const groq = new Groq({ apiKey });

      const systemPrompt = `You are a workflow generator for FlowReach AI, a lead outreach automation platform.
Given a natural language description, generate a workflow as JSON with "name", "nodes", and "edges".

Available node types and their data fields:
- startNode: { label, trigger: "manual"|"webhook"|"scheduled" }
- aiGenerateNode: { label, prompt (use {{name}}, {{company}}, {{title}}, {{email}} placeholders), tone: "professional"|"friendly"|"casual"|"formal"|"persuasive", maxLength: number }
- emailNode: { label, subject (supports {{name}}, {{company}} placeholders), fromName }
- delayNode: { label, duration: number, unit: "seconds"|"minutes"|"hours"|"days" }
- conditionNode: { label, field: "status"|"company"|"title", operator: "equals"|"not_equals"|"contains", value }
- updateLeadNode: { label, status: "new"|"contacted"|"replied"|"converted"|"bounced"|"unsubscribed" }
- endNode: { label }
- filterNode: { label, filterField, filterOp, filterValue }
- splitNode: { label, splitMode: "round_robin"|"random", percentage: number }

Node format: { id: "node-1", type: "startNode", position: { x: 250, y: number }, data: { ... } }
Edge format: { id: "edge-1", source: "node-1", target: "node-2" }
For condition nodes, edges use sourceHandle: "yes" or "no".

Position nodes vertically (y increments of 150) at x=250, branching at x=50 and x=450.

Return ONLY valid JSON: { "name": "...", "nodes": [...], "edges": [...] }
No markdown, no code fences, no explanation.`;

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: description },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      });

      const raw = completion.choices[0]?.message?.content || '';
      let parsed;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        parsed = null;
      }

      if (!parsed || !parsed.nodes) {
        return res.status(500).json({ error: 'AI failed to generate a valid workflow. Try a different description.' });
      }

      name = parsed.name || 'AI-Generated Workflow';
      nodes = parsed.nodes;
      edges = parsed.edges || [];
    }

    // Save to DB
    const { data, error } = await supabase
      .from('workflows')
      .insert({
        name,
        description: description,
        nodes: JSON.stringify(nodes),
        edges: JSON.stringify(edges),
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      workflow: {
        ...data,
        nodes: typeof data.nodes === 'string' ? JSON.parse(data.nodes) : data.nodes,
        edges: typeof data.edges === 'string' ? JSON.parse(data.edges) : data.edges,
      },
      source: apiKey ? 'groq' : 'mock',
    });
  } catch (err) {
    console.error('AI workflow creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
