import supabase from './db.js';
import { generateMessage, replaceVariables } from './ai.js';
import { safeJsonParse } from './utils.js';
import nodemailer from 'nodemailer';

// ──────────────────────────────────────────────
// WorkflowExecutor — traverses workflow graph,
// executes each node, emits Socket.io events
// ──────────────────────────────────────────────

export class WorkflowExecutor {
  constructor({ workflow, lead, executionId, io }) {
    this.workflow = workflow;
    this.lead = lead;
    this.executionId = executionId;
    this.io = io;
    this.logs = [];
    this.context = { lead: { ...lead }, generatedMessage: null };
    this.nodes = safeJsonParse(workflow.nodes, []);
    this.edges = safeJsonParse(workflow.edges, []);
  }

  // Find the start node
  findStartNode() {
    return this.nodes.find(n => n.type === 'startNode');
  }

  // Get outgoing edges from a node (optionally filtered by sourceHandle)
  getOutgoingEdges(nodeId, sourceHandle = null) {
    return this.edges.filter(e => {
      if (e.source !== nodeId) return false;
      if (sourceHandle !== null) return e.sourceHandle === sourceHandle;
      return true;
    });
  }

  // Get next node(s) from a node
  getNextNodes(nodeId, sourceHandle = null) {
    const outEdges = this.getOutgoingEdges(nodeId, sourceHandle);
    return outEdges.map(e => this.nodes.find(n => n.id === e.target)).filter(Boolean);
  }

  // Add log entry and emit via Socket.io
  log(level, message, nodeId = null) {
    const entry = {
      time: new Date().toISOString(),
      level,
      message,
      nodeId,
    };
    this.logs.push(entry);
    if (this.io) {
      this.io.emit('execution:log', {
        executionId: this.executionId,
        log: entry,
      });
    }
  }

  // Update execution record in DB
  async updateExecution(fields) {
    const { error } = await supabase
      .from('executions')
      .update({ ...fields, logs: JSON.stringify(this.logs) })
      .eq('id', this.executionId);
    if (error) { /* failed to update execution */ }
  }

  // Emit status change via Socket.io
  emitStatus(status, currentNode = null) {
    if (this.io) {
      this.io.emit('execution:status', {
        executionId: this.executionId,
        status,
        currentNode,
        leadId: this.lead.id,
        workflowId: this.workflow.id,
      });
    }
  }

  // ── Main execution loop ──
  async execute() {
    const startNode = this.findStartNode();
    if (!startNode) {
      this.log('error', 'No start node found in workflow');
      await this.updateExecution({ status: 'failed', completed_at: new Date().toISOString() });
      this.emitStatus('failed');
      return { success: false, error: 'No start node found' };
    }

    await this.updateExecution({ status: 'running', started_at: new Date().toISOString(), current_node: startNode.data?.label || 'Start' });
    this.emitStatus('running', startNode.data?.label);
    this.log('info', `Starting workflow "${this.workflow.name}" for lead ${this.lead.name} (${this.lead.email})`);

    try {
      await this.executeNode(startNode);
      await this.updateExecution({ status: 'completed', completed_at: new Date().toISOString(), current_node: null });
      this.emitStatus('completed');
      this.log('info', `Workflow completed successfully for ${this.lead.name}`);
      return { success: true, logs: this.logs };
    } catch (err) {
      this.log('error', `Workflow failed: ${err.message}`);
      await this.updateExecution({ status: 'failed', completed_at: new Date().toISOString() });
      this.emitStatus('failed');
      return { success: false, error: err.message, logs: this.logs };
    }
  }

  // ── Execute a single node and recurse ──
  async executeNode(node) {
    const label = node.data?.label || node.type;
    this.log('info', `Executing node: ${label}`, node.id);
    await this.updateExecution({ current_node: label });
    this.emitStatus('running', label);

    try {
      switch (node.type) {
        case 'startNode':
          await this.handleStart(node);
          break;
        case 'aiGenerateNode':
          await this.handleAIGenerate(node);
          break;
        case 'emailNode':
          await this.handleEmail(node);
          break;
        case 'delayNode':
          await this.handleDelay(node);
          break;
        case 'conditionNode':
          await this.handleCondition(node);
          return; // condition handles its own branching
        case 'updateLeadNode':
          await this.handleUpdateLead(node);
          break;
        case 'endNode':
          this.log('info', 'Reached end node — workflow complete');
          return;
        case 'aiAgentNode':
          await this.handleAIAgent(node);
          break;
        case 'filterNode':
          await this.handleFilter(node);
          break;
        case 'splitNode':
          await this.handleSplit(node);
          return; // split handles its own branching
        case 'httpRequestNode':
          await this.handleHttpRequest(node);
          break;
        case 'codeNode':
          await this.handleCode(node);
          break;
        case 'summarizerNode':
          await this.handleSummarizer(node);
          break;
        case 'classifierNode':
          await this.handleClassifier(node);
          break;
        case 'slackNode':
          await this.handleSlack(node);
          break;
        case 'smsNode':
          await this.handleSms(node);
          break;
        case 'whatsappNode':
          await this.handleWhatsApp(node);
          break;
        case 'telegramNode':
          await this.handleTelegram(node);
          break;
        case 'discordNode':
          await this.handleDiscord(node);
          break;
        case 'webhookNode':
          this.log('info', `Webhook node "${label}" — skipped in manual execution`);
          break;
        case 'scheduleNode':
          this.log('info', `Schedule node "${label}" — skipped in manual execution`);
          break;
        case 'mergeNode':
          this.log('info', `Merge node "${label}" — pass-through`);
          break;
        default:
          this.log('warn', `Unknown node type: ${node.type} — skipping`);
      }
    } catch (nodeErr) {
      this.log('error', `Node "${label}" failed: ${nodeErr.message}`, node.id);
      // Continue to next nodes instead of crashing the entire workflow
    }

    // Move to next node(s)
    const nextNodes = this.getNextNodes(node.id);
    for (const next of nextNodes) {
      await this.executeNode(next);
    }
  }

  // ── Node Handlers ──

  async handleStart(node) {
    this.log('info', `Trigger: ${node.data?.trigger || 'manual'}`);
  }

  async handleAIGenerate(node) {
    const { prompt, tone, maxLength, companyName, senderName, industry, painPoints, callToAction, signature, language, messageType } = node.data || {};
    if (!prompt) {
      this.log('warn', 'AI Generate node has no prompt — using default');
    }
    const actualPrompt = prompt || 'Write a professional outreach email to {{name}} at {{company}}.';
    this.log('info', `Generating AI message (tone: ${tone || 'professional'}, type: ${messageType || 'outreach_email'})...`);

    const result = await generateMessage({
      lead: this.context.lead,
      prompt: actualPrompt,
      tone: tone || 'professional',
      maxLength: maxLength || 200,
      companyName,
      senderName,
      industry,
      painPoints,
      callToAction,
      signature,
      language,
      messageType,
    });

    this.context.generatedMessage = result;
    this.log('info', `AI message generated (source: ${result.source}) — Subject: "${result.subject}"`);

    // Store in messages table
    await supabase.from('messages').insert({
      lead_id: this.lead.id,
      execution_id: this.executionId,
      type: 'ai_generated',
      subject: result.subject,
      body: result.body,
      status: 'draft',
    });
  }

  async handleEmail(node) {
    const { subject, fromName } = node.data || {};
    let msg = this.context.generatedMessage;

    if (!msg) {
      this.log('warn', 'No AI-generated message available — generating default');
      await this.handleAIGenerate({
        data: { prompt: 'Write a professional email to {{name}} at {{company}}.', tone: 'professional', maxLength: 200 },
      });
      msg = this.context.generatedMessage;
    }

    const finalSubject = replaceVariables(subject || msg?.subject || 'Hello from FlowReach AI', this.context.lead);
    const finalBody = msg?.body || 'Hello, this is a message from FlowReach AI.';
    const senderName = fromName || 'FlowReach AI';

    // Check blacklist
    const { data: blocked } = await supabase
      .from('blacklist')
      .select('id')
      .eq('email', this.lead.email)
      .maybeSingle();

    if (blocked) {
      this.log('warn', `Email to ${this.lead.email} BLOCKED — address is blacklisted`);
      await supabase.from('messages').insert({
        lead_id: this.lead.id,
        execution_id: this.executionId,
        type: 'email',
        subject: finalSubject,
        body: finalBody,
        status: 'blocked',
      });
      return;
    }

    // Check daily send limit
    const today = new Date().toISOString().split('T')[0];
    const { data: dailyCount } = await supabase
      .from('daily_send_counts')
      .select('count')
      .eq('date', today)
      .maybeSingle();

    const currentCount = dailyCount?.count || 0;
    const dailyLimit = Number.parseInt(process.env.DAILY_SEND_LIMIT || '50', 10);

    if (currentCount >= dailyLimit) {
      this.log('warn', `Daily send limit (${dailyLimit}) reached — email not sent`);
      await supabase.from('messages').insert({
        lead_id: this.lead.id,
        execution_id: this.executionId,
        type: 'email',
        subject: finalSubject,
        body: finalBody,
        status: 'rate_limited',
      });
      return;
    }

    // Send email via nodemailer
    try {
      const transporter = await this.getEmailTransporter();

      // Verify SMTP connection before sending
      try {
        await transporter.verify();
      } catch (verifyErr) {
        this.log('error', `SMTP connection failed: ${verifyErr.message}. Check SMTP_HOST, SMTP_USER, and SMTP_PASS in .env`);
        await supabase.from('messages').insert({
          lead_id: this.lead.id,
          execution_id: this.executionId,
          type: 'email',
          subject: finalSubject,
          body: finalBody,
          status: 'failed',
        });
        return;
      }

      const mailOptions = {
        from: `"${senderName}" <${process.env.SMTP_FROM || process.env.SMTP_USER || 'flowreach@example.com'}>`,
        to: this.lead.email,
        subject: finalSubject,
        html: finalBody.replaceAll('\n', '<br>'),
      };

      await transporter.sendMail(mailOptions);
      this.log('info', `Email sent to ${this.lead.email} — Subject: "${finalSubject}"`);

      // Update daily count
      if (dailyCount) {
        await supabase.from('daily_send_counts').update({ count: currentCount + 1 }).eq('date', today);
      } else {
        await supabase.from('daily_send_counts').insert({ date: today, count: 1 });
      }

      // Store sent message
      await supabase.from('messages').insert({
        lead_id: this.lead.id,
        execution_id: this.executionId,
        type: 'email',
        subject: finalSubject,
        body: finalBody,
        status: 'sent',
      });

      // Update lead status
      await supabase.from('leads').update({ status: 'contacted', updated_at: new Date().toISOString() }).eq('id', this.lead.id);
    } catch (err) {
      this.log('error', `Failed to send email: ${err.message}`);
      // Still store the message as failed
      await supabase.from('messages').insert({
        lead_id: this.lead.id,
        execution_id: this.executionId,
        type: 'email',
        subject: finalSubject,
        body: finalBody,
        status: 'failed',
      });
    }
  }

  async getEmailTransporter() {
    // Try to get SMTP credentials from env
    const host = process.env.SMTP_HOST;
    const port = Number.parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      if (host.includes('gmail')) {
        return nodemailer.createTransport({
          service: 'gmail',
          auth: { user, pass },
        });
      }
      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      });
    }

    // Try credentials table
    const { data: smtpCred } = await supabase
      .from('credentials')
      .select('*')
      .eq('type', 'smtp')
      .limit(1)
      .maybeSingle();

    if (smtpCred) {
      const config = safeJsonParse(smtpCred.config, {});
      if (config.host && config.user && config.pass) {
        return nodemailer.createTransport({
          host: config.host,
          port: Number.parseInt(config.port || '587', 10),
          secure: Number.parseInt(config.port || '587', 10) === 465,
          auth: { user: config.user, pass: config.pass },
          tls: { rejectUnauthorized: false },
        });
      }
    }

    // Fallback: use Ethereal (test email service)
    this.log('warn', 'No SMTP configured — using Ethereal test email service');
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    return transporter;
  }

  async handleDelay(node) {
    const { duration, unit } = node.data || {};
    const ms = this.durationToMs(duration || 1, unit || 'seconds');
    // Cap delay to 10s for demo purposes
    const cappedMs = Math.min(ms, 10000);
    this.log('info', `Waiting ${duration || 1} ${unit || 'seconds'}... (capped to ${cappedMs / 1000}s for demo)`);
    await new Promise(r => setTimeout(r, cappedMs));
    this.log('info', 'Delay complete');
  }

  durationToMs(duration, unit) {
    const multipliers = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000 };
    return (duration || 1) * (multipliers[unit] || 1000);
  }

  async handleCondition(node) {
    const { field, operator, value } = node.data || {};
    const leadValue = String(this.context.lead[field] || '').toLowerCase();
    const compareValue = String(value || '').toLowerCase();

    let result = false;
    switch (operator) {
      case 'equals': result = leadValue === compareValue; break;
      case 'not_equals': result = leadValue !== compareValue; break;
      case 'contains': result = leadValue.includes(compareValue); break;
      case 'greater_than': result = Number.parseFloat(leadValue) > Number.parseFloat(compareValue); break;
      case 'less_than': result = Number.parseFloat(leadValue) < Number.parseFloat(compareValue); break;
      default: result = leadValue === compareValue;
    }

    this.log('info', `Condition: ${field} ${operator} "${value}" → ${result ? 'YES' : 'NO'}`);

    const branch = result ? 'yes' : 'no';
    const nextNodes = this.getNextNodes(node.id, branch);

    // If no specific branch edges, try default edges
    if (nextNodes.length === 0) {
      const fallback = this.getNextNodes(node.id);
      for (const next of fallback) {
        await this.executeNode(next);
      }
    } else {
      for (const next of nextNodes) {
        await this.executeNode(next);
      }
    }
  }

  async handleUpdateLead(node) {
    const { status } = node.data || {};
    if (!status) {
      this.log('warn', 'UpdateLead node has no status — skipping');
      return;
    }
    const { error } = await supabase
      .from('leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', this.lead.id);

    if (error) {
      this.log('error', `Failed to update lead status: ${error.message}`);
    } else {
      this.context.lead.status = status;
      this.log('info', `Lead status updated to "${status}"`);
    }
  }

  async handleAIAgent(node) {
    const { userPrompt, model } = node.data || {};
    const filledPrompt = replaceVariables(userPrompt || 'Analyze lead: {{name}} at {{company}}', this.context.lead);

    this.log('info', `Running AI Agent (model: ${model || 'llama-3.3-70b-versatile'})...`);

    const result = await generateMessage({
      lead: this.context.lead,
      prompt: filledPrompt,
      tone: 'professional',
      maxLength: 500,
    });

    this.context.aiAgentResult = result;
    this.log('info', `AI Agent response received (source: ${result.source})`);
  }

  async handleFilter(node) {
    const { filterField, filterOp, filterValue } = node.data || {};
    const val = String(this.context.lead[filterField] || '').toLowerCase();
    const compare = String(filterValue || '').toLowerCase();

    let pass = false;
    switch (filterOp) {
      case 'equals': pass = val === compare; break;
      case 'not_equals': pass = val !== compare; break;
      case 'contains': pass = val.includes(compare); break;
      default: pass = true;
    }

    if (!pass) {
      this.log('info', `Filter: Lead filtered out (${filterField} ${filterOp} "${filterValue}")`);
      return; // Stop execution for this lead
    }
    this.log('info', `Filter: Lead passed (${filterField} ${filterOp} "${filterValue}")`);
  }

  async handleSplit(node) {
    const outEdges = this.getOutgoingEdges(node.id);
    if (outEdges.length === 0) {
      this.log('warn', 'Split node has no outgoing edges');
      return;
    }
    // Pick random branch for demo
    const picked = outEdges[Math.floor(Math.random() * outEdges.length)];
    const nextNode = this.nodes.find(n => n.id === picked.target);
    this.log('info', `Split: Randomly picked branch → ${nextNode?.data?.label || picked.target}`);
    if (nextNode) await this.executeNode(nextNode);
  }

  async handleHttpRequest(node) {
    const { method, url, headers, body } = node.data || {};
    const filledUrl = replaceVariables(url || '', this.context.lead);
    this.log('info', `HTTP ${method || 'GET'} → ${filledUrl || '(no URL configured)'}`);
    if (!filledUrl) {
      this.log('warn', 'HTTP Request node has no URL — skipping');
      return;
    }

    try {
      const opts = { method: method || 'GET', headers: { 'Content-Type': 'application/json' } };
      if (headers) {
        try { Object.assign(opts.headers, safeJsonParse(headers, {})); } catch { /* ignore */ }
      }
      if (body && ['POST', 'PUT', 'PATCH'].includes((method || '').toUpperCase())) {
        opts.body = replaceVariables(body, this.context.lead);
      }
      const resp = await fetch(filledUrl, opts);
      this.log('info', `HTTP Response: ${resp.status} ${resp.statusText}`);
    } catch (err) {
      this.log('error', `HTTP Request failed: ${err.message}`);
    }
  }

  async handleCode(node) {
    const { code, language } = node.data || {};
    this.log('info', `Code node — running (language: ${language || 'javascript'})`);

    if (!code?.trim()) {
      this.log('warn', 'Code node — no code provided, skipping');
      return;
    }

    if (language && language !== 'javascript') {
      this.log('warn', `Code node — only JavaScript is supported, got "${language}". Skipping.`);
      return;
    }

    try {
      const { createContext, Script } = await import('node:vm');
      const sandbox = {
        lead: { ...this.context.lead },
        context: { ...this.context },
        result: null,
        console: {
          log: (...args) => this.log('info', `[code] ${args.join(' ')}`),
          warn: (...args) => this.log('warn', `[code] ${args.join(' ')}`),
          error: (...args) => this.log('error', `[code] ${args.join(' ')}`),
        },
      };
      createContext(sandbox);
      const script = new Script(code, { timeout: 5000 });
      script.runInContext(sandbox, { timeout: 5000 });

      if (sandbox.result !== null && sandbox.result !== undefined) {
        this.context.codeResult = sandbox.result;
        this.log('info', `Code result: ${JSON.stringify(sandbox.result).substring(0, 200)}`);
      } else {
        this.log('info', 'Code executed successfully (no result returned)');
      }
    } catch (err) {
      this.log('error', `Code execution failed: ${err.message}`);
    }
  }

  async handleSummarizer(node) {
    const { style, outputLength } = node.data || {};
    this.log('info', `Summarizer (style: ${style || 'bullets'}, length: ${outputLength || 100})...`);

    const result = await generateMessage({
      lead: this.context.lead,
      prompt: `Summarize information about {{name}} at {{company}} in ${style || 'bullet'} format.`,
      tone: 'professional',
      maxLength: outputLength || 100,
    });

    this.context.summary = result.body;
    this.log('info', 'Summary generated');
  }

  async handleClassifier(node) {
    const { categories, classifyPrompt } = node.data || {};
    const cats = Array.isArray(categories) ? categories : ['hot_lead', 'warm_lead', 'cold_lead'];

    this.log('info', `Classifier — categories: ${cats.join(', ')}`);

    const result = await generateMessage({
      lead: this.context.lead,
      prompt: classifyPrompt || `Classify {{name}} from {{company}} ({{title}}) into one of: ${cats.join(', ')}. Return just the category name.`,
      tone: 'professional',
      maxLength: 50,
    });

    this.context.classification = result.body;
    this.log('info', `Classification result: ${result.body}`);
  }

  async handleSlack(node) {
    const { channel, message } = node.data || {};
    const filledMessage = replaceVariables(message || 'New lead activity: {{name}} from {{company}}', this.context.lead);

    this.log('info', `Slack: Sending to #${channel || 'general'}: "${filledMessage.substring(0, 100)}..."`);

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (webhookUrl) {
      try {
        const resp = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: filledMessage, channel: channel ? `#${channel}` : undefined }),
        });
        if (resp.ok) {
          this.log('info', 'Slack message sent successfully');
        } else {
          const result = await resp.text();
          this.log('warn', `Slack API error: ${result.substring(0, 200)}`);
        }
      } catch (err) {
        this.log('error', `Slack send failed: ${err.message}`);
      }
    } else {
      this.log('warn', 'Slack not configured — message logged only');
    }

    await supabase.from('messages').insert({
      lead_id: this.lead.id,
      execution_id: this.executionId,
      type: 'slack',
      channel: 'slack',
      subject: null,
      body: filledMessage,
      status: webhookUrl ? 'sent' : 'draft',
    });
  }

  async handleSms(node) {
    const { to, smsMessage } = node.data || {};
    const filledMsg = replaceVariables(smsMessage || 'Hi {{name}}, check your email!', this.context.lead);
    const recipient = replaceVariables(to || '', this.context.lead) || this.context.lead?.phone || 'N/A';

    this.log('info', `SMS: Sending to ${recipient}: "${filledMsg.substring(0, 100)}..."`);

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioAuth && twilioFrom && recipient !== 'N/A') {
      try {
        const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: recipient, From: twilioFrom, Body: filledMsg }).toString(),
        });
        const result = await resp.json();
        if (resp.ok || resp.status === 201) {
          this.log('info', `SMS sent successfully (sid: ${result.sid || 'N/A'})`);
        } else {
          this.log('warn', `Twilio API error: ${result.message || JSON.stringify(result)}`);
        }
      } catch (err) {
        this.log('error', `SMS send failed: ${err.message}`);
      }
    } else {
      this.log('warn', 'SMS (Twilio) not configured — message logged only');
    }

    await supabase.from('messages').insert({
      lead_id: this.lead.id,
      execution_id: this.executionId,
      type: 'sms',
      channel: 'sms',
      subject: null,
      body: filledMsg,
      status: twilioSid ? 'sent' : 'draft',
    });
  }

  async handleWhatsApp(node) {
    const { phoneNumber, waMessage } = node.data || {};
    const filledMsg = replaceVariables(waMessage || 'Hi {{name}}, this is a message from FlowReach AI.', this.context.lead);
    const recipient = replaceVariables(phoneNumber || '', this.context.lead) || this.lead.phone || 'N/A';

    this.log('info', `WhatsApp: Sending to ${recipient}: "${filledMsg.substring(0, 100)}..."`);

    // Try WhatsApp Cloud API if configured
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (token && phoneNumberId) {
      try {
        const resp = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: recipient.replaceAll(/\D/g, ''),
            type: 'text',
            text: { body: filledMsg },
          }),
        });
        const result = await resp.json();
        if (resp.ok) {
          this.log('info', `WhatsApp sent successfully (id: ${result.messages?.[0]?.id || 'N/A'})`);
        } else {
          this.log('warn', `WhatsApp API error: ${JSON.stringify(result.error || result)}`);
        }
      } catch (err) {
        this.log('error', `WhatsApp send failed: ${err.message}`);
      }
    } else {
      this.log('warn', 'WhatsApp not configured — message logged only');
    }

    // Store message
    await supabase.from('messages').insert({
      lead_id: this.lead.id,
      execution_id: this.executionId,
      type: 'whatsapp',
      channel: 'whatsapp',
      subject: null,
      body: filledMsg,
      status: token ? 'sent' : 'draft',
    });
  }

  async handleTelegram(node) {
    const { chatId, tgMessage } = node.data || {};
    const filledMsg = replaceVariables(tgMessage || 'Hi {{name}}, message from FlowReach AI.', this.context.lead);
    const targetChat = replaceVariables(chatId || '', this.context.lead) || process.env.TELEGRAM_CHAT_ID || 'N/A';

    this.log('info', `Telegram: Sending to chat ${targetChat}: "${filledMsg.substring(0, 100)}..."`);

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (botToken && targetChat !== 'N/A') {
      try {
        const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: targetChat,
            text: filledMsg,
            parse_mode: 'HTML',
          }),
        });
        const result = await resp.json();
        if (result.ok) {
          this.log('info', `Telegram sent successfully (message_id: ${result.result?.message_id || 'N/A'})`);
        } else {
          this.log('warn', `Telegram API error: ${result.description || JSON.stringify(result)}`);
        }
      } catch (err) {
        this.log('error', `Telegram send failed: ${err.message}`);
      }
    } else {
      this.log('warn', 'Telegram not configured — message logged only');
    }

    await supabase.from('messages').insert({
      lead_id: this.lead.id,
      execution_id: this.executionId,
      type: 'telegram',
      channel: 'telegram',
      subject: null,
      body: filledMsg,
      status: botToken ? 'sent' : 'draft',
    });
  }

  async handleDiscord(node) {
    const { webhookUrl, dcMessage } = node.data || {};
    const filledMsg = replaceVariables(dcMessage || 'Hi {{name}}, message from FlowReach AI.', this.context.lead);

    this.log('info', `Discord: Sending message: "${filledMsg.substring(0, 100)}..."`);

    const targetUrl = webhookUrl || process.env.DISCORD_WEBHOOK_URL;

    if (targetUrl) {
      try {
        const resp = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: filledMsg }),
        });
        if (resp.ok || resp.status === 204) {
          this.log('info', 'Discord message sent successfully');
        } else {
          const result = await resp.text();
          this.log('warn', `Discord API error: ${result.substring(0, 200)}`);
        }
      } catch (err) {
        this.log('error', `Discord send failed: ${err.message}`);
      }
    } else {
      this.log('warn', 'Discord not configured — message logged only');
    }

    await supabase.from('messages').insert({
      lead_id: this.lead.id,
      execution_id: this.executionId,
      type: 'discord',
      channel: 'discord',
      subject: null,
      body: filledMsg,
      status: targetUrl ? 'sent' : 'draft',
    });
  }
}

export default WorkflowExecutor;
