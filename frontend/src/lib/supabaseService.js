// ============================================================
// FlowReach AI — Supabase Service Layer
// All database operations in one place.
// Import individual functions where needed.
// ============================================================

import { supabase } from '../supabaseClient';

// ──────────────────────────────────────────────
// LEADS
// ──────────────────────────────────────────────

export async function fetchLeads({ search, status, page = 1, limit = 50 } = {}) {
  const offset = (page - 1) * limit;
  let query = supabase.from('leads').select('*', { count: 'exact' });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
  }
  if (status) {
    query = query.eq('status', status);
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    leads: data || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function fetchLeadById(id) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function bulkImportLeads(leads) {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validLeads = [];
  let skipped = 0;
  const errors = [];

  for (const lead of leads) {
    if (!lead.name || !lead.email) {
      skipped++;
      errors.push(`Missing name or email: ${JSON.stringify(lead).slice(0, 80)}`);
      continue;
    }
    if (!EMAIL_RE.test(lead.email)) {
      skipped++;
      errors.push(`Invalid email: ${lead.email}`);
      continue;
    }
    validLeads.push({
      name: String(lead.name),
      email: String(lead.email),
      company: lead.company ? String(lead.company) : null,
      title: lead.title ? String(lead.title) : null,
      status: 'new',
      source: lead.source ? String(lead.source) : 'csv_import',
      custom_fields: lead.custom_fields ? JSON.stringify(lead.custom_fields) : null,
    });
  }

  let imported = 0;
  for (let i = 0; i < validLeads.length; i += 500) {
    const batch = validLeads.slice(i, i + 500);
    const { data, error } = await supabase.from('leads').insert(batch).select();
    if (error) {
      errors.push(`Batch error: ${error.message}`);
      skipped += batch.length;
    } else {
      imported += data.length;
    }
  }

  return { imported, skipped, total: leads.length, errors: errors.slice(0, 10) };
}

export async function updateLead(id, updates) {
  const { data, error } = await supabase
    .from('leads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLead(id) {
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw error;
}

// ──────────────────────────────────────────────
// WORKFLOWS
// ──────────────────────────────────────────────

export async function fetchWorkflows() {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((w) => ({
    ...w,
    nodes: typeof w.nodes === 'string' ? JSON.parse(w.nodes) : w.nodes || [],
    edges: typeof w.edges === 'string' ? JSON.parse(w.edges) : w.edges || [],
    is_active: Boolean(w.is_active),
  }));
}

export async function fetchWorkflowById(id) {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return {
    ...data,
    nodes: typeof data.nodes === 'string' ? JSON.parse(data.nodes) : data.nodes || [],
    edges: typeof data.edges === 'string' ? JSON.parse(data.edges) : data.edges || [],
    is_active: Boolean(data.is_active),
  };
}

export async function createWorkflow({ name, description, nodes, edges }) {
  const { data, error } = await supabase
    .from('workflows')
    .insert({
      name: name.trim(),
      description: description || '',
      nodes: JSON.stringify(nodes || []),
      edges: JSON.stringify(edges || []),
    })
    .select()
    .single();
  if (error) throw error;
  return {
    ...data,
    nodes: typeof data.nodes === 'string' ? JSON.parse(data.nodes) : data.nodes,
    edges: typeof data.edges === 'string' ? JSON.parse(data.edges) : data.edges,
    is_active: Boolean(data.is_active),
  };
}

export async function updateWorkflow(id, updates) {
  const payload = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.nodes !== undefined) payload.nodes = JSON.stringify(updates.nodes);
  if (updates.edges !== undefined) payload.edges = JSON.stringify(updates.edges);
  if (updates.is_active !== undefined) payload.is_active = Boolean(updates.is_active);

  const { data, error } = await supabase
    .from('workflows')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return {
    ...data,
    nodes: typeof data.nodes === 'string' ? JSON.parse(data.nodes) : data.nodes,
    edges: typeof data.edges === 'string' ? JSON.parse(data.edges) : data.edges,
    is_active: Boolean(data.is_active),
  };
}

export async function deleteWorkflow(id) {
  const { error } = await supabase.from('workflows').delete().eq('id', id);
  if (error) throw error;
}

// Seed 5 default workflow templates
export async function seedWorkflowTemplates() {
  const templates = [
    {
      name: 'Cold Outreach Sequence',
      description: 'Automated cold email sequence with AI-generated personalization and follow-ups',
      nodes: JSON.stringify([
        { id: 'start-1', type: 'startNode', position: { x: 250, y: 50 }, data: { label: 'Start', trigger: 'manual' } },
        { id: 'ai-1', type: 'aiGenerateNode', position: { x: 250, y: 180 }, data: { label: 'Generate Cold Email', prompt: 'Write a personalized cold outreach email to {{name}} at {{company}}.', tone: 'professional', maxLength: 200 } },
        { id: 'email-1', type: 'emailNode', position: { x: 250, y: 320 }, data: { label: 'Send Cold Email', subject: 'Quick question about {{company}}', fromName: 'FlowReach AI' } },
        { id: 'delay-1', type: 'delayNode', position: { x: 250, y: 460 }, data: { label: 'Wait 3 Days', duration: 3, unit: 'days' } },
        { id: 'condition-1', type: 'conditionNode', position: { x: 250, y: 600 }, data: { label: 'Replied?', field: 'status', operator: 'equals', value: 'replied' } },
        { id: 'update-1', type: 'updateLeadNode', position: { x: 500, y: 740 }, data: { label: 'Mark Converted', status: 'converted' } },
        { id: 'ai-2', type: 'aiGenerateNode', position: { x: 50, y: 740 }, data: { label: 'Generate Follow-up', prompt: 'Write a polite follow-up email to {{name}}.', tone: 'friendly', maxLength: 150 } },
        { id: 'email-2', type: 'emailNode', position: { x: 50, y: 880 }, data: { label: 'Send Follow-up', subject: 'Following up — {{company}}', fromName: 'FlowReach AI' } },
        { id: 'end-1', type: 'endNode', position: { x: 250, y: 1020 }, data: { label: 'End' } },
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
        { id: 'e-update1-end', source: 'update-1', target: 'end-1' },
      ]),
    },
    {
      name: 'Lead Nurture Drip',
      description: 'Multi-touch nurture sequence for warm leads',
      nodes: JSON.stringify([
        { id: 'start-1', type: 'startNode', position: { x: 250, y: 50 }, data: { label: 'Start', trigger: 'manual' } },
        { id: 'ai-1', type: 'aiGenerateNode', position: { x: 250, y: 180 }, data: { label: 'Welcome Email', prompt: 'Write a warm welcome email to {{name}}.', tone: 'friendly', maxLength: 200 } },
        { id: 'email-1', type: 'emailNode', position: { x: 250, y: 320 }, data: { label: 'Send Welcome', subject: 'Welcome, {{name}}!', fromName: 'FlowReach Team' } },
        { id: 'delay-1', type: 'delayNode', position: { x: 250, y: 460 }, data: { label: 'Wait 2 Days', duration: 2, unit: 'days' } },
        { id: 'update-1', type: 'updateLeadNode', position: { x: 250, y: 600 }, data: { label: 'Mark Contacted', status: 'contacted' } },
        { id: 'end-1', type: 'endNode', position: { x: 250, y: 740 }, data: { label: 'End' } },
      ]),
      edges: JSON.stringify([
        { id: 'e-start-ai1', source: 'start-1', target: 'ai-1' },
        { id: 'e-ai1-email1', source: 'ai-1', target: 'email-1' },
        { id: 'e-email1-delay1', source: 'email-1', target: 'delay-1' },
        { id: 'e-delay1-update1', source: 'delay-1', target: 'update-1' },
        { id: 'e-update1-end', source: 'update-1', target: 'end-1' },
      ]),
    },
    {
      name: 'Re-engagement Campaign',
      description: 'Win-back campaign for leads that went cold',
      nodes: JSON.stringify([
        { id: 'start-1', type: 'startNode', position: { x: 250, y: 50 }, data: { label: 'Start', trigger: 'manual' } },
        { id: 'condition-1', type: 'conditionNode', position: { x: 250, y: 180 }, data: { label: 'Is Bounced?', field: 'status', operator: 'equals', value: 'bounced' } },
        { id: 'update-1', type: 'updateLeadNode', position: { x: 500, y: 320 }, data: { label: 'Mark Unsubscribed', status: 'unsubscribed' } },
        { id: 'ai-1', type: 'aiGenerateNode', position: { x: 50, y: 320 }, data: { label: 'Win-back Email', prompt: 'Write a re-engagement email to {{name}}.', tone: 'casual', maxLength: 180 } },
        { id: 'email-1', type: 'emailNode', position: { x: 50, y: 460 }, data: { label: 'Send Win-back', subject: 'We miss you!', fromName: 'FlowReach AI' } },
        { id: 'end-1', type: 'endNode', position: { x: 250, y: 600 }, data: { label: 'End' } },
      ]),
      edges: JSON.stringify([
        { id: 'e-start-cond1', source: 'start-1', target: 'condition-1' },
        { id: 'e-cond1-update', source: 'condition-1', target: 'update-1', sourceHandle: 'yes', label: 'Yes' },
        { id: 'e-cond1-ai1', source: 'condition-1', target: 'ai-1', sourceHandle: 'no', label: 'No' },
        { id: 'e-ai1-email1', source: 'ai-1', target: 'email-1' },
        { id: 'e-email1-end', source: 'email-1', target: 'end-1' },
        { id: 'e-update-end', source: 'update-1', target: 'end-1' },
      ]),
    },
    {
      name: 'AI-Powered Lead Scoring',
      description: 'Use AI to score and route leads automatically',
      nodes: JSON.stringify([
        { id: 'start-1', type: 'startNode', position: { x: 250, y: 50 }, data: { label: 'Start', trigger: 'webhook' } },
        { id: 'ai-1', type: 'aiAgentNode', position: { x: 250, y: 200 }, data: { label: 'Score Lead', provider: 'groq', model: 'llama-3.3-70b-versatile', systemPrompt: 'Score this lead 1-10.', userPrompt: 'Lead: {{name}}, {{company}}, {{title}}' } },
        { id: 'condition-1', type: 'conditionNode', position: { x: 250, y: 380 }, data: { label: 'Score > 7?', field: 'score', operator: 'greater_than', value: '7' } },
        { id: 'update-1', type: 'updateLeadNode', position: { x: 450, y: 520 }, data: { label: 'Mark Hot', status: 'contacted' } },
        { id: 'update-2', type: 'updateLeadNode', position: { x: 50, y: 520 }, data: { label: 'Mark Cold', status: 'new' } },
        { id: 'end-1', type: 'endNode', position: { x: 250, y: 660 }, data: { label: 'End' } },
      ]),
      edges: JSON.stringify([
        { id: 'e-start-ai', source: 'start-1', target: 'ai-1' },
        { id: 'e-ai-cond', source: 'ai-1', target: 'condition-1' },
        { id: 'e-cond-hot', source: 'condition-1', target: 'update-1', sourceHandle: 'yes', label: 'Yes' },
        { id: 'e-cond-cold', source: 'condition-1', target: 'update-2', sourceHandle: 'no', label: 'No' },
        { id: 'e-hot-end', source: 'update-1', target: 'end-1' },
        { id: 'e-cold-end', source: 'update-2', target: 'end-1' },
      ]),
    },
    {
      name: 'Multi-Channel Outreach',
      description: 'A/B split between email and SMS channels',
      nodes: JSON.stringify([
        { id: 'start-1', type: 'startNode', position: { x: 250, y: 50 }, data: { label: 'Start', trigger: 'scheduled' } },
        { id: 'split-1', type: 'splitNode', position: { x: 250, y: 200 }, data: { label: 'A/B Split', mode: 'percentage', percentages: [50, 50] } },
        { id: 'email-1', type: 'emailNode', position: { x: 100, y: 370 }, data: { label: 'Email Path', subject: 'Hello {{name}}', fromName: 'FlowReach' } },
        { id: 'sms-1', type: 'smsNode', position: { x: 400, y: 370 }, data: { label: 'SMS Path', message: 'Hi {{name}}, check your inbox!' } },
        { id: 'end-1', type: 'endNode', position: { x: 250, y: 520 }, data: { label: 'End' } },
      ]),
      edges: JSON.stringify([
        { id: 'e-start-split', source: 'start-1', target: 'split-1' },
        { id: 'e-split-email', source: 'split-1', target: 'email-1', sourceHandle: 'a' },
        { id: 'e-split-sms', source: 'split-1', target: 'sms-1', sourceHandle: 'b' },
        { id: 'e-email-end', source: 'email-1', target: 'end-1' },
        { id: 'e-sms-end', source: 'sms-1', target: 'end-1' },
      ]),
    },
  ];

  const { data, error } = await supabase.from('workflows').insert(templates).select();
  if (error) throw error;
  return data;
}

// ──────────────────────────────────────────────
// STATS / DASHBOARD
// ──────────────────────────────────────────────

export async function fetchStatsOverview() {
  // Total leads
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  // Leads by status
  const { data: allLeads } = await supabase.from('leads').select('status');
  const statusCounts = {};
  for (const l of allLeads || []) {
    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
  }
  const leadsByStatus = Object.entries(statusCounts)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // Workflows
  const { count: totalWorkflows } = await supabase
    .from('workflows')
    .select('*', { count: 'exact', head: true });
  const { count: activeWorkflows } = await supabase
    .from('workflows')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // Executions
  const { count: totalExecutions } = await supabase
    .from('executions')
    .select('*', { count: 'exact', head: true });
  const { data: allExecs } = await supabase.from('executions').select('status');
  const execCounts = {};
  for (const e of allExecs || []) {
    execCounts[e.status] = (execCounts[e.status] || 0) + 1;
  }
  const executionsByStatus = Object.entries(execCounts)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // Messages sent
  const { count: totalMessagesSent } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('status', ['sent', 'delivered', 'opened']);

  // Messages last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data: recentMessages } = await supabase
    .from('messages')
    .select('created_at')
    .gte('created_at', sevenDaysAgo.toISOString());
  const msgByDate = {};
  for (const m of recentMessages || []) {
    const d = m.created_at.split('T')[0];
    msgByDate[d] = (msgByDate[d] || 0) + 1;
  }
  const messagesLast7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    messagesLast7Days.push({ date: dateStr, count: msgByDate[dateStr] || 0 });
  }

  // Recent leads
  const { data: recentLeads } = await supabase
    .from('leads')
    .select('id, name, email, company, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  // Conversion rate
  const convertedCount = leadsByStatus.find((s) => s.status === 'converted')?.count || 0;
  const conversionRate =
    (totalLeads || 0) > 0 ? Number(((convertedCount / totalLeads) * 100).toFixed(1)) : 0;

  return {
    totalLeads: totalLeads || 0,
    totalWorkflows: totalWorkflows || 0,
    activeWorkflows: activeWorkflows || 0,
    totalExecutions: totalExecutions || 0,
    totalMessagesSent: totalMessagesSent || 0,
    conversionRate,
    leadsByStatus,
    executionsByStatus,
    messagesLast7Days,
    recentLeads: recentLeads || [],
  };
}

// ──────────────────────────────────────────────
// CREDENTIALS
// ──────────────────────────────────────────────

export async function fetchCredentials() {
  const { data, error } = await supabase
    .from('credentials')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;

  return (data || []).map((c) => {
    const config = typeof c.config === 'string' ? JSON.parse(c.config) : c.config || {};
    const masked = {};
    for (const [key, val] of Object.entries(config)) {
      if (typeof val === 'string' && val.length > 8) {
        masked[key] = val.slice(0, 4) + '\u2022'.repeat(Math.min(val.length - 8, 20)) + val.slice(-4);
      } else {
        masked[key] = val;
      }
    }
    return { ...c, config: masked };
  });
}

export async function fetchCredentialById(id) {
  const { data, error } = await supabase
    .from('credentials')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return {
    ...data,
    config: typeof data.config === 'string' ? JSON.parse(data.config) : data.config || {},
  };
}

export async function fetchCredentialsByType(type) {
  const { data, error } = await supabase
    .from('credentials')
    .select('id, name, type')
    .eq('type', type);
  if (error) throw error;
  return data || [];
}

export async function createCredential({ name, type, config }) {
  const { data, error } = await supabase
    .from('credentials')
    .insert({ name: name.trim(), type, config: JSON.stringify(config || {}) })
    .select()
    .single();
  if (error) throw error;
  return {
    ...data,
    config: typeof data.config === 'string' ? JSON.parse(data.config) : data.config,
  };
}

export async function updateCredential(id, { name, config }) {
  const payload = { updated_at: new Date().toISOString() };
  if (name !== undefined) payload.name = name;
  if (config !== undefined) payload.config = JSON.stringify(config);

  const { data, error } = await supabase
    .from('credentials')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return {
    ...data,
    config: typeof data.config === 'string' ? JSON.parse(data.config) : data.config,
  };
}

export async function deleteCredential(id) {
  const { error } = await supabase.from('credentials').delete().eq('id', id);
  if (error) throw error;
}

// ──────────────────────────────────────────────
// BLACKLIST
// ──────────────────────────────────────────────

export async function fetchBlacklist() {
  const { data, error } = await supabase
    .from('blacklist')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addToBlacklist(email, reason) {
  const { data, error } = await supabase
    .from('blacklist')
    .insert({ email, reason })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeFromBlacklist(id) {
  const { error } = await supabase.from('blacklist').delete().eq('id', id);
  if (error) throw error;
}

// ──────────────────────────────────────────────
// EXECUTIONS
// ──────────────────────────────────────────────

export async function fetchExecutions() {
  const { data, error } = await supabase
    .from('executions')
    .select('*, workflows(name), leads(name, email)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchExecutionById(id) {
  const { data, error } = await supabase
    .from('executions')
    .select('*, workflows(name), leads(name, email)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// ──────────────────────────────────────────────
// STORAGE  (bucket: "app-files")
// ──────────────────────────────────────────────

const BUCKET = 'app-files';

/**
 * Upload a file to Supabase Storage.
 * Path: {userId}/{feature}/{uuid}.{ext}
 */
export async function uploadFile(filePath, file) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { upsert: false });
  if (error) throw error;
  return data;
}

/**
 * Get a signed URL for a private file (valid for 1 hour).
 */
export async function getSignedUrl(filePath, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Delete a file from storage.
 */
export async function deleteFile(filePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .remove([filePath]);
  if (error) throw error;
  return data;
}

/**
 * Get current user id (returns null if not authenticated).
 */
export async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
