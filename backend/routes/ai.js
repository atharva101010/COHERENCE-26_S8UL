import { Router } from 'express';
import supabase from '../db.js';
import { generateMessage, previewMessages } from '../ai.js';
import { safeJsonParse } from '../utils.js';
import Groq from 'groq-sdk';

const router = Router();

// POST /api/ai/generate — Generate a single message for one lead
router.post('/generate', async (req, res) => {
  try {
    const { leadId, prompt, tone, maxLength, credentialId, model, companyName, senderName, industry, painPoints, callToAction, signature, language, messageType } = req.body;

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

    const result = await generateMessage({ lead, prompt, tone, maxLength, credentialId, model, companyName, senderName, industry, painPoints, callToAction, signature, language, messageType });

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
    if (insertError) { /* message storage failed silently */ }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/preview — Preview messages for multiple leads
router.post('/preview', async (req, res) => {
  try {
    const { prompt, tone, maxLength, credentialId, model, leadIds, companyName, senderName, industry, painPoints, callToAction, signature, language, messageType } = req.body;

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

    const results = await previewMessages({ leads, prompt, tone, maxLength, credentialId, model, companyName, senderName, industry, painPoints, callToAction, signature, language, messageType });
    res.json({ previews: results, source: results[0]?.source || 'mock' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/chat — Direct AI chat conversation (with history support)
router.post('/chat', async (req, res) => {
  try {
    const { message, context, model, history, conversationId } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const apiKey = process.env.GROQ_API_KEY;

    // Store user message if conversationId provided
    let convId = conversationId;
    if (convId) {
      await supabase.from('ai_chat_messages').insert({
        conversation_id: convId,
        role: 'user',
        content: message,
      });
      await supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId);
    }

    if (!apiKey) {
      const reply = `I'd be happy to help! You asked: "${message}"\n\nHere are some things I can help you with:\n• Generate personalized outreach emails\n• Create workflow automation strategies\n• Analyze lead data and suggest approaches\n• Write follow-up sequences\n\n(Note: Set GROQ_API_KEY for full AI responses)`;
      if (convId) {
        await supabase.from('ai_chat_messages').insert({ conversation_id: convId, role: 'assistant', content: reply, source: 'mock' });
      }
      return res.json({ reply, source: 'mock' });
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

    const chatMessages = [{ role: 'system', content: systemPrompt }];

    // Include conversation history for context
    if (history && Array.isArray(history)) {
      for (const h of history.slice(-20)) {
        if (h.role === 'user' || h.role === 'assistant') {
          chatMessages.push({ role: h.role, content: h.content });
        }
      }
    }

    chatMessages.push({ role: 'user', content: message });

    const completion = await groq.chat.completions.create({
      model: model || 'llama-3.3-70b-versatile',
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const reply = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    // Store assistant reply
    if (convId) {
      await supabase.from('ai_chat_messages').insert({ conversation_id: convId, role: 'assistant', content: reply, source: 'groq' });
    }

    res.json({ reply, source: 'groq', model: model || 'llama-3.3-70b-versatile' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/conversations — List all conversations
router.get('/conversations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/conversations — Create a new conversation
router.post('/conversations', async (req, res) => {
  try {
    const { title } = req.body;
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({ title: title || 'New Chat' })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/conversations/:id/messages — Get messages for a conversation
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('conversation_id', Number(id))
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ai/conversations/:id — Update conversation title
router.put('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const { data, error } = await supabase
      .from('ai_conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', Number(id))
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Conversation not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ai/conversations/:id — Delete a conversation and its messages
router.delete('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('ai_conversations').delete().eq('id', Number(id));
    if (error) return res.status(500).json({ error: error.message });
    res.json({ deleted: true, id: Number(id) });
  } catch (err) {
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

    if (apiKey) {
      const groq = new Groq({ apiKey });

      const systemPrompt = `You are a workflow generator for FlowReach AI, a lead outreach automation platform.
Given a natural language description, generate a workflow as JSON with "name", "nodes", and "edges".

Available node types and their data fields:
- startNode: { label, trigger: "manual"|"webhook"|"scheduled" }
- aiGenerateNode: { label, prompt (use {{name}}, {{company}}, {{title}}, {{email}} placeholders), tone: "professional"|"friendly"|"casual"|"formal"|"persuasive", maxLength: number }
- emailNode: { label, subject (supports {{name}}, {{company}} placeholders), fromName }
- whatsappNode: { label, phoneNumber (use {{phone}} placeholder), waMessage }
- telegramNode: { label, chatId, tgMessage }
- discordNode: { label, webhookUrl, dcMessage }
- slackNode: { label, channel (e.g. "general"), message }
- smsNode: { label, to (phone number), smsMessage }
- delayNode: { label, duration: number, unit: "seconds"|"minutes"|"hours"|"days" }
- conditionNode: { label, field: "status"|"company"|"title", operator: "equals"|"not_equals"|"contains", value }
- updateLeadNode: { label, status: "new"|"contacted"|"replied"|"converted"|"bounced"|"unsubscribed" }
- endNode: { label }
- filterNode: { label, filterField, filterOp, filterValue }
- splitNode: { label, splitMode: "round_robin"|"random", percentage: number }

When the user mentions WhatsApp, Telegram, Discord, or Slack, use those node types. If they mention multi-channel, add multiple messaging nodes in parallel using a split node.

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
        const jsonMatch = /\{[\s\S]*\}/.exec(raw);
        parsed = jsonMatch ? safeJsonParse(jsonMatch[0], null) : null;
      } catch {
        parsed = null;
      }

      if (!parsed?.nodes) {
        return res.status(500).json({ error: 'AI failed to generate a valid workflow. Try a different description.' });
      }

      name = parsed.name || 'AI-Generated Workflow';
      nodes = parsed.nodes;
      edges = parsed.edges || [];
    } else {
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
        nodes: typeof data.nodes === 'string' ? safeJsonParse(data.nodes, []) : data.nodes,
        edges: typeof data.edges === 'string' ? safeJsonParse(data.edges, []) : data.edges,
      },
      source: apiKey ? 'groq' : 'mock',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: map entry status to message DB status
function resolveMessageStatus(entryStatus) {
  if (entryStatus === 'sent') return 'sent';
  if (entryStatus === 'logged') return 'draft';
  return entryStatus;
}

// Individual channel handlers for direct send
async function handleEmailDirect(message, recipient) {
  const entry = { channel: 'email', status: 'pending', detail: '' };
  const toEmail = recipient?.email;
  if (!toEmail) { entry.status = 'skipped'; entry.detail = 'No email address'; return entry; }

  try {
    const nodemailer = (await import('nodemailer')).default;
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    console.log('[Email] SMTP config:', { host, userSet: !!user, passSet: !!pass, to: toEmail });

    if (!host || !user || !pass) {
      entry.status = 'logged';
      entry.detail = `Email logged (SMTP not configured). To: ${toEmail}, Subject: "${message.subject || 'No subject'}"`;
      return entry;
    }

    let transporter;
    if (host.includes('gmail')) {
      console.log('[Email] Using Gmail service transport');
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    } else {
      const port = Number.parseInt(process.env.SMTP_PORT || '587', 10);
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000,
      });
    }

    console.log('[Email] Sending to:', toEmail);
    const info = await transporter.sendMail({
      from: `"FlowReach AI" <${process.env.SMTP_FROM || process.env.SMTP_USER || 'flowreach@example.com'}>`,
      to: toEmail,
      subject: message.subject || 'Message from FlowReach AI',
      html: message.body.replaceAll('\n', '<br>'),
    });
    entry.status = 'sent';
    entry.detail = `Message-ID: ${info.messageId}`;
  } catch (err) {
    entry.status = 'failed';
    entry.detail = `Email send failed: ${err.message}. To: ${toEmail}`;
  }
  return entry;
}

async function handleWhatsAppDirect(message, recipient) {
  const entry = { channel: 'whatsapp', status: 'pending', detail: '' };
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const toPhone = recipient?.phone || recipient?.whatsapp;
  if (!token || !phoneNumberId) { entry.status = 'logged'; entry.detail = 'WhatsApp not configured — logged only'; return entry; }
  if (!toPhone) { entry.status = 'skipped'; entry.detail = 'No phone number'; return entry; }

  const resp = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toPhone.replaceAll(/\D/g, ''),
      type: 'text',
      text: { body: message.body },
    }),
  });
  if (resp.ok) { entry.status = 'sent'; entry.detail = 'WhatsApp message sent'; }
  else { const err = await resp.json(); entry.status = 'failed'; entry.detail = JSON.stringify(err.error || err); }
  return entry;
}

async function handleTelegramDirect(message, recipient) {
  const entry = { channel: 'telegram', status: 'pending', detail: '' };
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = recipient?.telegram || recipient?.chatId;
  if (!botToken) { entry.status = 'logged'; entry.detail = 'Telegram bot not configured — logged only'; return entry; }
  if (!chatId) { entry.status = 'skipped'; entry.detail = 'No chat ID'; return entry; }

  const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message.body, parse_mode: 'HTML' }),
  });
  if (resp.ok) { entry.status = 'sent'; entry.detail = 'Telegram message sent'; }
  else { const err = await resp.json(); entry.status = 'failed'; entry.detail = err.description || 'Telegram error'; }
  return entry;
}

async function handleDiscordDirect(message, recipient) {
  const entry = { channel: 'discord', status: 'pending', detail: '' };
  const webhookUrl = recipient?.discordWebhook || process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) { entry.status = 'logged'; entry.detail = 'Discord webhook not configured — logged only'; return entry; }

  const resp = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message.body.substring(0, 2000) }),
  });
  entry.status = resp.ok || resp.status === 204 ? 'sent' : 'failed';
  entry.detail = entry.status === 'sent' ? 'Discord message sent' : `Discord error (${resp.status})`;
  return entry;
}

async function handleSlackDirect(message, recipient) {
  const entry = { channel: 'slack', status: 'pending', detail: '' };
  const slackWebhook = recipient?.slackWebhook || process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhook) { entry.status = 'logged'; entry.detail = 'Slack webhook not configured — logged only'; return entry; }

  const resp = await fetch(slackWebhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message.body }),
  });
  entry.status = resp.ok ? 'sent' : 'failed';
  entry.detail = entry.status === 'sent' ? 'Slack message sent' : `Slack error (${resp.status})`;
  return entry;
}

const directHandlers = { email: handleEmailDirect, whatsapp: handleWhatsAppDirect, telegram: handleTelegramDirect, discord: handleDiscordDirect, slack: handleSlackDirect };

// Helper: send a message via a single channel, returns { channel, status, detail }
async function sendViaChannel(channel, message, recipient) {
  const handler = directHandlers[channel];
  if (!handler) return { channel, status: 'skipped', detail: `Unknown channel: ${channel}` };
  return handler(message, recipient);
}

// Individual channel handlers for bulk send
async function handleBulkEmail(message, lead) {
  const entry = { channel: 'email', status: 'pending', detail: '' };
  if (!lead.email) { entry.status = 'skipped'; entry.detail = 'No email address'; return entry; }

  try {
    const nodemailer = (await import('nodemailer')).default;
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
      entry.status = 'logged';
      entry.detail = `Email logged (SMTP not configured). To: ${lead.email}`;
      return entry;
    }

    const port = Number.parseInt(process.env.SMTP_PORT || '587', 10);
    let transporter;
    if (host.includes('gmail')) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    } else {
      transporter = nodemailer.createTransport({
        host, port,
        secure: port === 465,
        auth: { user, pass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000,
      });
    }

    const info = await transporter.sendMail({
      from: `"FlowReach AI" <${process.env.SMTP_FROM || process.env.SMTP_USER || 'flowreach@example.com'}>`,
      to: lead.email,
      subject: message.subject || 'Message from FlowReach AI',
      html: message.body.replaceAll('\n', '<br>'),
    });
    entry.status = 'sent';
    entry.detail = `Message-ID: ${info.messageId}`;
  } catch (err) {
    entry.status = 'logged';
    entry.detail = `Email logged (send failed: ${err.message}). To: ${lead.email}`;
  }
  return entry;
}

async function handleBulkTelegram(message, lead) {
  const entry = { channel: 'telegram', status: 'pending', detail: '' };
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) { entry.status = 'skipped'; entry.detail = 'Telegram not configured'; return entry; }

  const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: `[To: ${lead.name}]\n\n${message.body}`, parse_mode: 'HTML' }),
  });
  entry.status = resp.ok ? 'sent' : 'failed';
  entry.detail = resp.ok ? 'Telegram sent' : 'Telegram error';
  return entry;
}

async function handleBulkDiscord(message, lead) {
  const entry = { channel: 'discord', status: 'pending', detail: '' };
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) { entry.status = 'skipped'; entry.detail = 'Discord not configured'; return entry; }

  const resp = await fetch(webhookUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: `**To: ${lead.name}** (${lead.email})\n\n${message.body}`.substring(0, 2000) }),
  });
  entry.status = (resp.ok || resp.status === 204) ? 'sent' : 'failed';
  entry.detail = entry.status === 'sent' ? 'Discord sent' : `Discord error (${resp.status})`;
  return entry;
}

async function handleBulkSlack(message, lead) {
  const entry = { channel: 'slack', status: 'pending', detail: '' };
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhook) { entry.status = 'skipped'; entry.detail = 'Slack not configured'; return entry; }

  const resp = await fetch(slackWebhook, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `*To: ${lead.name}* (${lead.email})\n\n${message.body}` }),
  });
  entry.status = resp.ok ? 'sent' : 'failed';
  entry.detail = entry.status === 'sent' ? 'Slack sent' : `Slack error (${resp.status})`;
  return entry;
}

const bulkHandlers = { email: handleBulkEmail, telegram: handleBulkTelegram, discord: handleBulkDiscord, slack: handleBulkSlack };

// Helper: send a message via a single channel for bulk mode (uses env-based recipients)
async function sendBulkViaChannel(channel, message, lead) {
  const handler = bulkHandlers[channel];
  if (!handler) return { channel, status: 'skipped', detail: `Unknown channel: ${channel}` };
  return handler(message, lead);
}

// POST /api/ai/send — Send a generated message via multiple channels
router.post('/send', async (req, res) => {
  try {
    const { channels, message, recipient } = req.body;
    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({ error: 'At least one channel is required' });
    }
    if (!message?.body) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    const results = [];

    for (const channel of channels) {
      let entry;
      try {
        entry = await sendViaChannel(channel, message, recipient);
      } catch (chErr) {
        entry = { channel, status: 'failed', detail: chErr.message };
      }

      // Store message record
      await supabase.from('messages').insert({
        lead_id: recipient?.leadId || null,
        type: channel,
        channel: channel,
        subject: message.subject || null,
        body: message.body,
        status: resolveMessageStatus(entry.status),
      }).then(() => {}).catch(() => {});

      results.push(entry);
    }

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: process a single lead during bulk send
async function processBulkLead(lead, channels, genOpts) {
  const leadResult = { leadId: lead.id, name: lead.name, email: lead.email, company: lead.company, channels: [] };
  try {
    const generated = await generateMessage({ lead, ...genOpts });
    const message = { subject: generated.subject, body: generated.body };

    for (const channel of channels) {
      let entry;
      try {
        entry = await sendBulkViaChannel(channel, message, lead);
      } catch (chErr) {
        entry = { channel, status: 'failed', detail: chErr.message };
      }

      await supabase.from('messages').insert({
        lead_id: lead.id,
        type: channel,
        channel,
        subject: message.subject || null,
        body: message.body,
        status: resolveMessageStatus(entry.status),
      }).catch(() => {});

      leadResult.channels.push(entry);
    }
  } catch (genErr) {
    leadResult.channels.push({ channel: 'ai', status: 'failed', detail: `Generation failed: ${genErr.message}` });
  }
  return leadResult;
}

// Helper: compute bulk send summary
function computeBulkSummary(results, leadCount) {
  const totalSent = results.reduce((acc, r) => acc + r.channels.filter(c => c.status === 'sent').length, 0);
  const totalFailed = results.reduce((acc, r) => acc + r.channels.filter(c => c.status === 'failed').length, 0);
  const totalSkipped = results.reduce((acc, r) => acc + r.channels.filter(c => c.status === 'skipped').length, 0);
  return { totalLeads: leadCount, totalSent, totalFailed, totalSkipped };
}

// POST /api/ai/bulk-send — Generate AI messages and send to multiple leads in bulk
router.post('/bulk-send', async (req, res) => {
  try {
    const { leadIds, channels, prompt, tone, maxLength, companyName, senderName, industry, painPoints, callToAction, signature, language, messageType } = req.body;

    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({ error: 'At least one channel is required' });
    }
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt template is required' });
    }

    // Fetch leads — either specific IDs or all
    let leads = [];
    if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
      const { data, error } = await supabase.from('leads').select('*').in('id', leadIds);
      if (error) return res.status(500).json({ error: 'Failed to fetch leads: ' + error.message });
      leads = data || [];
    } else {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) return res.status(500).json({ error: 'Failed to fetch leads: ' + error.message });
      leads = data || [];
    }

    if (leads.length === 0) {
      return res.status(400).json({ error: 'No leads found to send to' });
    }

    const io = req.app.get('io');
    const genOpts = { prompt, tone, maxLength, companyName, senderName, industry, painPoints, callToAction, signature, language, messageType };
    let completed = 0;
    const results = [];

    for (const lead of leads) {
      const leadResult = await processBulkLead(lead, channels, genOpts);
      results.push(leadResult);
      completed++;
      if (io) {
        io.emit('bulk-send:progress', { completed, total: leads.length, lead: lead.name });
      }
    }

    const summary = computeBulkSummary(results, leads.length);

    if (io) {
      io.emit('bulk-send:complete', { totalSent: summary.totalSent, totalFailed: summary.totalFailed, totalSkipped: summary.totalSkipped, leadCount: leads.length });
    }

    res.json({ results, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
