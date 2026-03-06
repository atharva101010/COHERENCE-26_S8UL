import supabase from './db.js';
import { generateMessage, replaceVariables } from './ai.js';
import nodemailer from 'nodemailer';
import whatsappService from './whatsapp.js';
import twilio from 'twilio';

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
    this.nodes = typeof workflow.nodes === 'string' ? JSON.parse(workflow.nodes) : workflow.nodes || [];
    this.edges = typeof workflow.edges === 'string' ? JSON.parse(workflow.edges) : workflow.edges || [];
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
    if (error) console.error('Failed to update execution:', error.message);
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
        case 'callNode':
          await this.handleCall(node);
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
    const msg = this.context.generatedMessage;

    if (!msg) {
      this.log('warn', 'No AI-generated message available — generating default');
      await this.handleAIGenerate({
        data: { prompt: 'Write a professional email to {{name}} at {{company}}.', tone: 'professional', maxLength: 200 },
      });
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
      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
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
      const config = typeof smtpCred.config === 'string' ? JSON.parse(smtpCred.config) : smtpCred.config || {};
      if (config.host && config.user && config.pass) {
        return nodemailer.createTransport({
          host: config.host,
          port: Number.parseInt(config.port || '587', 10),
          secure: Number.parseInt(config.port || '587', 10) === 465,
          auth: { user: config.user, pass: config.pass },
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
        try { Object.assign(opts.headers, JSON.parse(headers)); } catch { /* ignore */ }
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
    this.log('info', `Code node — execution skipped for security (language: ${node.data?.language || 'javascript'})`);
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
    this.log('info', `Slack: Would send to #${channel || 'general'}: "${filledMessage.substring(0, 100)}..."`);
    // In production, integrate with Slack API
  }

  async handleSms(node) {
    const { to, smsMessage } = node.data || {};
    const filledMsg = replaceVariables(smsMessage || 'Hi {{name}}, check your email!', this.context.lead);
    const recipient = replaceVariables(to || '', this.context.lead) || this.lead.phone || 'N/A';
    this.log('info', `SMS: Would send to ${recipient}: "${filledMsg.substring(0, 100)}..."`);
    // In production, integrate with Twilio or similar
  }

  async handleWhatsApp(node) {
    const { to, whatsappMessage } = node.data || {};
    const msg = this.context.generatedMessage;

    // Build message body
    let messageBody;
    if (whatsappMessage) {
      messageBody = replaceVariables(whatsappMessage, this.context.lead);
    } else if (msg?.body) {
      // Strip HTML tags for WhatsApp (plain text)
      messageBody = msg.body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    } else {
      messageBody = `Hi ${this.lead.name}, this is a message from FlowReach AI regarding ${this.lead.company || 'your company'}. We'd love to connect!`;
    }

    // Resolve recipient phone number
    const recipientPhone = replaceVariables(to || '', this.context.lead) || this.lead.phone;

    if (!recipientPhone) {
      this.log('warn', 'WhatsApp node: No phone number for lead \u2014 skipping');
      await supabase.from('messages').insert({
        lead_id: this.lead.id,
        execution_id: this.executionId,
        type: 'whatsapp',
        subject: 'WhatsApp Message',
        body: messageBody,
        status: 'failed',
      });
      return;
    }

    // Check blacklist
    const { data: blocked } = await supabase
      .from('blacklist')
      .select('id')
      .eq('email', this.lead.email)
      .maybeSingle();

    if (blocked) {
      this.log('warn', `WhatsApp to ${recipientPhone} BLOCKED \u2014 lead is blacklisted`);
      await supabase.from('messages').insert({
        lead_id: this.lead.id,
        execution_id: this.executionId,
        type: 'whatsapp',
        subject: 'WhatsApp Message',
        body: messageBody,
        status: 'blocked',
      });
      return;
    }

    // Send via whatsapp-web.js (free, no API key needed)
    const result = await whatsappService.sendMessage(recipientPhone, messageBody);

    if (result.success) {
      this.log('info', `WhatsApp sent to ${recipientPhone} \u2014 ID: ${result.messageId}`);
      await supabase.from('messages').insert({
        lead_id: this.lead.id,
        execution_id: this.executionId,
        type: 'whatsapp',
        subject: 'WhatsApp Message',
        body: messageBody,
        status: 'sent',
      });
      await supabase.from('leads').update({ status: 'contacted', updated_at: new Date().toISOString() }).eq('id', this.lead.id);
    } else if (result.simulated) {
      this.log('warn', 'WhatsApp not connected \u2014 message simulated. Scan QR code in terminal to connect.');
      this.log('info', `WhatsApp (simulated) to ${recipientPhone}: "${messageBody.substring(0, 100)}..."`);
      await supabase.from('messages').insert({
        lead_id: this.lead.id,
        execution_id: this.executionId,
        type: 'whatsapp',
        subject: 'WhatsApp Message (Simulated)',
        body: messageBody,
        status: 'sent',
      });
      await supabase.from('leads').update({ status: 'contacted', updated_at: new Date().toISOString() }).eq('id', this.lead.id);
    } else {
      this.log('error', `WhatsApp send failed: ${result.error}`);
      await supabase.from('messages').insert({
        lead_id: this.lead.id,
        execution_id: this.executionId,
        type: 'whatsapp',
        subject: 'WhatsApp Message',
        body: messageBody,
        status: 'failed',
      });
    }
  }

  async handleCall(node) {
    const { to, callMessage, voiceName } = node.data || {};
    const msg = this.context.generatedMessage;

    // Build the spoken message
    let spokenText;
    if (callMessage) {
      spokenText = replaceVariables(callMessage, this.context.lead);
    } else if (msg?.body) {
      // Strip HTML for voice
      spokenText = msg.body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    } else {
      spokenText = `Hello ${this.lead.name}. This is an automated call from FlowReach AI on behalf of ${this.lead.company || 'your contact'}. We would love to connect with you to discuss how we can help your business. Please check your email for more details. Thank you and have a great day!`;
    }

    // Resolve recipient phone number
    const recipientPhone = replaceVariables(to || '', this.context.lead) || this.lead.phone;

    if (!recipientPhone) {
      this.log('warn', 'Call node: No phone number for lead — skipping');
      await supabase.from('messages').insert({
        lead_id: this.lead.id,
        execution_id: this.executionId,
        type: 'call',
        subject: 'Automated Call',
        body: spokenText,
        status: 'failed',
      });
      return;
    }

    // Check blacklist
    const { data: blocked } = await supabase
      .from('blacklist')
      .select('id')
      .eq('email', this.lead.email)
      .maybeSingle();

    if (blocked) {
      this.log('warn', `Call to ${recipientPhone} BLOCKED — lead is blacklisted`);
      await supabase.from('messages').insert({
        lead_id: this.lead.id,
        execution_id: this.executionId,
        type: 'call',
        subject: 'Automated Call',
        body: spokenText,
        status: 'blocked',
      });
      return;
    }

    // Get Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_FROM;

    if (!accountSid || !authToken || !fromNumber) {
      // Check credentials table as fallback
      const { data: twilioCred } = await supabase
        .from('credentials')
        .select('*')
        .eq('type', 'twilio')
        .limit(1)
        .maybeSingle();

      if (!twilioCred) {
        this.log('warn', 'No Twilio credentials configured — Call simulated');
        this.log('info', `Call (simulated) to ${recipientPhone}: "${spokenText.substring(0, 120)}..."`);
        await supabase.from('messages').insert({
          lead_id: this.lead.id,
          execution_id: this.executionId,
          type: 'call',
          subject: 'Automated Call (Simulated)',
          body: spokenText,
          status: 'sent',
        });
        await supabase.from('leads').update({ status: 'contacted', updated_at: new Date().toISOString() }).eq('id', this.lead.id);
        return;
      }

      const config = typeof twilioCred.config === 'string' ? JSON.parse(twilioCred.config) : twilioCred.config || {};
      return await this._makeCall(config.accountSid, config.authToken, config.phoneFrom, recipientPhone, spokenText, voiceName);
    }

    await this._makeCall(accountSid, authToken, fromNumber, recipientPhone, spokenText, voiceName);
  }

  async _makeCall(accountSid, authToken, fromNumber, toNumber, spokenText, voiceName) {
    try {
      const client = twilio(accountSid, authToken);

      // Build TwiML for text-to-speech
      const voice = voiceName || 'Polly.Joanna'; // AWS Polly neural voice
      const twiml = `<Response><Say voice="${voice}">${spokenText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Say><Pause length="1"/><Say voice="${voice}">Goodbye!</Say></Response>`;

      const call = await client.calls.create({
        from: fromNumber,
        to: toNumber,
        twiml,
      });

      this.log('info', `Call initiated to ${toNumber} — SID: ${call.sid}`);

      // Store call record
      await supabase.from('messages').insert({
        lead_id: this.lead.id,
        execution_id: this.executionId,
        type: 'call',
        subject: 'Automated Call',
        body: spokenText,
        status: 'sent',
      });

      // Update lead status
      await supabase.from('leads').update({ status: 'contacted', updated_at: new Date().toISOString() }).eq('id', this.lead.id);
    } catch (err) {
      this.log('error', `Call failed: ${err.message}`);
      await supabase.from('messages').insert({
        lead_id: this.lead.id,
        execution_id: this.executionId,
        type: 'call',
        subject: 'Automated Call',
        body: spokenText,
        status: 'failed',
      });
    }
  }
}

export default WorkflowExecutor;
