// ============================================================
// FlowReach AI — Supabase Service Layer
// All database operations in one place.
// Import individual functions where needed.
// ============================================================

import { supabase } from '../supabaseClient';
import { safeJsonParse } from './utils';

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLead(lead) {
  if (!lead.name || !lead.email) {
    return { valid: false, error: `Missing name or email: ${JSON.stringify(lead).slice(0, 80)}` };
  }
  if (!EMAIL_RE.test(lead.email)) {
    return { valid: false, error: `Invalid email: ${lead.email}` };
  }
  return {
    valid: true,
    data: {
      name: String(lead.name),
      email: String(lead.email),
      company: lead.company ? String(lead.company) : null,
      title: lead.title ? String(lead.title) : null,
      status: 'new',
      source: lead.source ? String(lead.source) : 'csv_import',
      custom_fields: lead.custom_fields ? JSON.stringify(lead.custom_fields) : null,
    },
  };
}

export async function bulkImportLeads(leads) {
  const validLeads = [];
  let skipped = 0;
  const errors = [];

  for (const lead of leads) {
    const result = validateLead(lead);
    if (!result.valid) {
      skipped++;
      errors.push(result.error);
      continue;
    }
    validLeads.push(result.data);
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
    nodes: typeof w.nodes === 'string' ? safeJsonParse(w.nodes, []) : w.nodes || [],
    edges: typeof w.edges === 'string' ? safeJsonParse(w.edges, []) : w.edges || [],
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
    nodes: typeof data.nodes === 'string' ? safeJsonParse(data.nodes, []) : data.nodes || [],
    edges: typeof data.edges === 'string' ? safeJsonParse(data.edges, []) : data.edges || [],
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
    nodes: typeof data.nodes === 'string' ? safeJsonParse(data.nodes, []) : data.nodes,
    edges: typeof data.edges === 'string' ? safeJsonParse(data.edges, []) : data.edges,
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
    nodes: typeof data.nodes === 'string' ? safeJsonParse(data.nodes, []) : data.nodes,
    edges: typeof data.edges === 'string' ? safeJsonParse(data.edges, []) : data.edges,
    is_active: Boolean(data.is_active),
  };
}

export async function deleteWorkflow(id) {
  const { error } = await supabase.from('workflows').delete().eq('id', id);
  if (error) throw error;
}

// Seed workflow templates via the backend API (handles deduplication)
export async function seedWorkflowTemplates() {
  const res = await fetch(`${API_BASE}/api/workflows/seed-templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to seed templates' }));
    throw new Error(err.error || 'Failed to seed templates');
  }
  return res.json();
}

// Toggle workflow active/inactive
export async function toggleWorkflowActive(id, isActive) {
  return updateWorkflow(id, { is_active: isActive });
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
    const config = typeof c.config === 'string' ? safeJsonParse(c.config, {}) : c.config || {};
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
    config: typeof data.config === 'string' ? safeJsonParse(data.config, {}) : data.config || {},
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
    config: typeof data.config === 'string' ? safeJsonParse(data.config, {}) : data.config,
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
    config: typeof data.config === 'string' ? safeJsonParse(data.config, {}) : data.config,
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

export async function fetchLeadMessageCounts(leadIds) {
  if (!leadIds || leadIds.length === 0) return {};
  const { data, error } = await supabase
    .from('messages')
    .select('lead_id')
    .in('lead_id', leadIds);
  if (error) throw error;
  const counts = {};
  for (const m of data || []) {
    counts[m.lead_id] = (counts[m.lead_id] || 0) + 1;
  }
  return counts;
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

// ──────────────────────────────────────────────
// AI MESSAGE GENERATION
// ──────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function generateAIMessage({ leadId, prompt, tone, maxLength, credentialId, model, lead, companyName, senderName, industry, painPoints, callToAction, signature, language, messageType }) {
  const res = await fetch(`${API_BASE}/api/ai/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId, prompt, tone, maxLength, credentialId, model, lead, companyName, senderName, industry, painPoints, callToAction, signature, language, messageType }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate AI message');
  }
  return res.json();
}

export async function previewAIMessages({ prompt, tone, maxLength, credentialId, model, leadIds }) {
  const res = await fetch(`${API_BASE}/api/ai/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, tone, maxLength, credentialId, model, leadIds }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to preview AI messages');
  }
  return res.json();
}

// ──────────────────────────────────────────────
// EXECUTION ENGINE
// ──────────────────────────────────────────────

export async function runWorkflowExecution({ workflowId, leadIds }) {
  const res = await fetch(`${API_BASE}/api/executions/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflowId, leadIds }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to start execution');
  }
  return res.json();
}

export async function fetchExecutionsFromAPI({ status, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.set('status', status);
  if (limit) params.set('limit', String(limit));
  const res = await fetch(`${API_BASE}/api/executions?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch executions');
  }
  return res.json();
}

// ──────────────────────────────────────────────
// AI CHAT (direct AI access)
// ──────────────────────────────────────────────

export async function chatWithAI({ message, context, model, history, conversationId }) {
  const res = await fetch(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context, model, history, conversationId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'AI chat failed');
  }
  return res.json();
}

// ──────────────────────────────────────────────
// AI CONVERSATIONS
// ──────────────────────────────────────────────

export async function fetchAIConversations() {
  const res = await fetch(`${API_BASE}/api/ai/conversations`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch conversations' }));
    throw new Error(err.error || 'Failed to fetch conversations');
  }
  return res.json();
}

export async function createAIConversation(title) {
  const res = await fetch(`${API_BASE}/api/ai/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create conversation' }));
    throw new Error(err.error || 'Failed to create conversation');
  }
  return res.json();
}

export async function fetchConversationMessages(conversationId) {
  const res = await fetch(`${API_BASE}/api/ai/conversations/${conversationId}/messages`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch messages' }));
    throw new Error(err.error || 'Failed to fetch messages');
  }
  return res.json();
}

export async function updateAIConversation(id, title) {
  const res = await fetch(`${API_BASE}/api/ai/conversations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update conversation' }));
    throw new Error(err.error || 'Failed to update conversation');
  }
  return res.json();
}

export async function deleteAIConversation(id) {
  const res = await fetch(`${API_BASE}/api/ai/conversations/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete conversation' }));
    throw new Error(err.error || 'Failed to delete conversation');
  }
  return res.json();
}

// ──────────────────────────────────────────────
// AI SEND / BULK SEND
// ──────────────────────────────────────────────

export async function sendAIMessageViaChannels({ channels, message, recipient }) {
  const res = await fetch(`${API_BASE}/api/ai/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channels, message, recipient }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Send failed' }));
    throw new Error(err.error || 'Send failed');
  }
  return res.json();
}

export async function bulkSendAIMessages(payload) {
  const res = await fetch(`${API_BASE}/api/ai/bulk-send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Bulk send failed' }));
    throw new Error(err.error || 'Bulk send failed');
  }
  return res.json();
}

export async function fetchLeadsForSelector(limit = 500) {
  const res = await fetch(`${API_BASE}/api/leads?limit=${limit}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch leads' }));
    throw new Error(err.error || 'Failed to fetch leads');
  }
  return res.json();
}

export async function createWorkflowWithAI({ description }) {
  const res = await fetch(`${API_BASE}/api/ai/create-workflow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'AI workflow creation failed');
  }
  return res.json();
}

// ──────────────────────────────────────────────
// PROFILE
// ──────────────────────────────────────────────

export async function fetchProfileAPI() {
  const res = await fetch(`${API_BASE}/api/profile`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch profile' }));
    throw new Error(err.error || 'Failed to fetch profile');
  }
  return res.json();
}

export async function updateProfileAPI(profile) {
  const res = await fetch(`${API_BASE}/api/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to save profile' }));
    throw new Error(err.error || 'Failed to save profile');
  }
  return res.json();
}

export async function uploadAvatarAPI({ base64, filename, contentType }) {
  const res = await fetch(`${API_BASE}/api/profile/avatar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, filename, contentType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to upload avatar' }));
    throw new Error(err.error || 'Failed to upload avatar');
  }
  return res.json();
}

// ──────────────────────────────────────────────
// SETTINGS API (backend routes)
// ──────────────────────────────────────────────

export async function fetchBlacklistAPI() {
  const res = await fetch(`${API_BASE}/api/settings/blacklist`);
  if (!res.ok) throw new Error('Failed to fetch blacklist');
  return res.json();
}

export async function addToBlacklistAPI(email, reason) {
  const res = await fetch(`${API_BASE}/api/settings/blacklist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, reason }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add to blacklist');
  }
  return res.json();
}

export async function removeFromBlacklistAPI(id) {
  const res = await fetch(`${API_BASE}/api/settings/blacklist/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to remove from blacklist');
  return res.json();
}

export async function fetchDailyStats() {
  const res = await fetch(`${API_BASE}/api/settings/daily-stats`);
  if (!res.ok) throw new Error('Failed to fetch daily stats');
  return res.json();
}

export async function fetchDailyStatsHistory() {
  const res = await fetch(`${API_BASE}/api/settings/daily-stats/history`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function resetDailyCount() {
  const res = await fetch(`${API_BASE}/api/settings/daily-stats/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset');
  return res.json();
}

export async function fetchSafetyScore() {
  const res = await fetch(`${API_BASE}/api/settings/safety-score`);
  if (!res.ok) throw new Error('Failed to fetch safety score');
  return res.json();
}

export async function resetSeedData() {
  const res = await fetch(`${API_BASE}/api/seed/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset demo data');
  return res.json();
}

// ──────────────────────────────────────────────
// CHANNELS
// ──────────────────────────────────────────────

export async function fetchChannelAccounts() {
  const res = await fetch(`${API_BASE}/api/channels/accounts`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch channel accounts' }));
    throw new Error(err.error || 'Failed to fetch channel accounts');
  }
  return res.json();
}

export async function createChannelAccount(data) {
  const res = await fetch(`${API_BASE}/api/channels/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create channel account' }));
    throw new Error(err.error || 'Failed to create channel account');
  }
  return res.json();
}

export async function updateChannelAccount(id, data) {
  const res = await fetch(`${API_BASE}/api/channels/accounts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update channel account' }));
    throw new Error(err.error || 'Failed to update channel account');
  }
  return res.json();
}

export async function deleteChannelAccount(id) {
  const res = await fetch(`${API_BASE}/api/channels/accounts/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete channel account' }));
    throw new Error(err.error || 'Failed to delete channel account');
  }
  return res.json();
}

export async function fetchChannelInbox({ channel, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (channel) params.set('channel', channel);
  const res = await fetch(`${API_BASE}/api/channels/inbox?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch inbox' }));
    throw new Error(err.error || 'Failed to fetch inbox');
  }
  return res.json();
}

// ──────────────────────────────────────────────
// MESSAGES
// ──────────────────────────────────────────────

export async function fetchMessages({ search, status, type, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (type) params.set('type', type);
  const res = await fetch(`${API_BASE}/api/messages?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch messages');
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { messages: [], total: 0, page: 1, totalPages: 0 }; }
}

export async function fetchMessageById(id) {
  const res = await fetch(`${API_BASE}/api/messages/${id}`);
  if (!res.ok) throw new Error('Failed to fetch message');
  return res.json();
}

// ──────────────────────────────────────────────
// TEAM COLLABORATION
// ──────────────────────────────────────────────

export async function fetchTeamMembers() {
  const res = await fetch(`${API_BASE}/api/features/team-members`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch team members' }));
    throw new Error(err.error || 'Failed to fetch team members');
  }
  return res.json();
}

export async function inviteTeamMember({ name, email, role }) {
  const res = await fetch(`${API_BASE}/api/features/team-members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to invite team member' }));
    throw new Error(err.error || 'Failed to invite team member');
  }
  return res.json();
}

export async function updateTeamMember(id, updates) {
  const res = await fetch(`${API_BASE}/api/features/team-members/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update team member' }));
    throw new Error(err.error || 'Failed to update team member');
  }
  return res.json();
}

export async function removeTeamMember(id) {
  const res = await fetch(`${API_BASE}/api/features/team-members/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to remove team member' }));
    throw new Error(err.error || 'Failed to remove team member');
  }
  return res.json();
}

export async function fetchTeamActivity() {
  const res = await fetch(`${API_BASE}/api/features/team-activity`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch team activity' }));
    throw new Error(err.error || 'Failed to fetch team activity');
  }
  return res.json();
}

// ──────────────────────────────────────────────
// WEBHOOKS
// ──────────────────────────────────────────────

export async function fetchWebhooks() {
  const res = await fetch(`${API_BASE}/api/features/webhooks`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch webhooks' }));
    throw new Error(err.error || 'Failed to fetch webhooks');
  }
  return res.json();
}

export async function createWebhook({ name, url, events, headers }) {
  const res = await fetch(`${API_BASE}/api/features/webhooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, url, events, headers }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create webhook' }));
    throw new Error(err.error || 'Failed to create webhook');
  }
  return res.json();
}

export async function updateWebhook(id, updates) {
  const res = await fetch(`${API_BASE}/api/features/webhooks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update webhook' }));
    throw new Error(err.error || 'Failed to update webhook');
  }
  return res.json();
}

export async function deleteWebhookAPI(id) {
  const res = await fetch(`${API_BASE}/api/features/webhooks/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete webhook' }));
    throw new Error(err.error || 'Failed to delete webhook');
  }
  return res.json();
}

export async function testWebhookAPI(id) {
  const res = await fetch(`${API_BASE}/api/features/webhooks/${id}/test`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Webhook test failed' }));
    throw new Error(err.error || 'Webhook test failed');
  }
  return res.json();
}

// ──────────────────────────────────────────────
// BOOKING LINKS (Calendar Integration)
// ──────────────────────────────────────────────

export async function fetchBookingLinks() {
  const res = await fetch(`${API_BASE}/api/features/booking-links`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch booking links' }));
    throw new Error(err.error || 'Failed to fetch booking links');
  }
  return res.json();
}

export async function createBookingLink({ name, duration, url, provider }) {
  const res = await fetch(`${API_BASE}/api/features/booking-links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, duration, url, provider }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create booking link' }));
    throw new Error(err.error || 'Failed to create booking link');
  }
  return res.json();
}

export async function updateBookingLink(id, updates) {
  const res = await fetch(`${API_BASE}/api/features/booking-links/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update booking link' }));
    throw new Error(err.error || 'Failed to update booking link');
  }
  return res.json();
}

export async function deleteBookingLink(id) {
  const res = await fetch(`${API_BASE}/api/features/booking-links/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete booking link' }));
    throw new Error(err.error || 'Failed to delete booking link');
  }
  return res.json();
}

// ──────────────────────────────────────────────
// CRM INTEGRATIONS
// ──────────────────────────────────────────────

export async function fetchCRMIntegrations() {
  const res = await fetch(`${API_BASE}/api/features/crm-integrations`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch CRM integrations' }));
    throw new Error(err.error || 'Failed to fetch CRM integrations');
  }
  return res.json();
}

export async function connectCRM({ provider, config }) {
  const res = await fetch(`${API_BASE}/api/features/crm-integrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, config }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to connect CRM' }));
    throw new Error(err.error || 'Failed to connect CRM');
  }
  return res.json();
}

export async function updateCRMIntegration(id, updates) {
  const res = await fetch(`${API_BASE}/api/features/crm-integrations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update CRM integration' }));
    throw new Error(err.error || 'Failed to update CRM integration');
  }
  return res.json();
}

export async function disconnectCRM(provider) {
  const res = await fetch(`${API_BASE}/api/features/crm-integrations/${provider}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to disconnect CRM' }));
    throw new Error(err.error || 'Failed to disconnect CRM');
  }
  return res.json();
}

// ──────────────────────────────────────────────
// ANALYTICS EXPORT
// ──────────────────────────────────────────────

export async function fetchAnalyticsExport() {
  const res = await fetch(`${API_BASE}/api/features/analytics/export`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch analytics' }));
    throw new Error(err.error || 'Failed to fetch analytics');
  }
  return res.json();
}

export async function fetchExportHistory() {
  const res = await fetch(`${API_BASE}/api/features/export-history`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch export history' }));
    throw new Error(err.error || 'Failed to fetch export history');
  }
  return res.json();
}

export async function logExport({ export_type, record_count, file_name, file_size_bytes }) {
  const res = await fetch(`${API_BASE}/api/features/export-history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ export_type, record_count, file_name, file_size_bytes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to log export' }));
    throw new Error(err.error || 'Failed to log export');
  }
  return res.json();
}

export async function deleteExportRecord(id) {
  const res = await fetch(`${API_BASE}/api/features/export-history/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete export record' }));
    throw new Error(err.error || 'Failed to delete export record');
  }
  return res.json();
}

// ──────────────────────────────────────────────
// A/B TESTING
// ──────────────────────────────────────────────

export async function fetchABTests() {
  const res = await fetch(`${API_BASE}/api/features/ab-tests`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch A/B tests' }));
    throw new Error(err.error || 'Failed to fetch A/B tests');
  }
  return res.json();
}

export async function createABTest(test) {
  const res = await fetch(`${API_BASE}/api/features/ab-tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(test),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create A/B test' }));
    throw new Error(err.error || 'Failed to create A/B test');
  }
  return res.json();
}

export async function updateABTest(id, updates) {
  const res = await fetch(`${API_BASE}/api/features/ab-tests/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update A/B test' }));
    throw new Error(err.error || 'Failed to update A/B test');
  }
  return res.json();
}

export async function deleteABTest(id) {
  const res = await fetch(`${API_BASE}/api/features/ab-tests/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete A/B test' }));
    throw new Error(err.error || 'Failed to delete A/B test');
  }
  return res.json();
}

// ──────────────────────────────────────────────
// EMAIL TRACKING
// ──────────────────────────────────────────────

export async function fetchTrackingStats() {
  const res = await fetch(`${API_BASE}/api/features/tracking-stats`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch tracking stats' }));
    throw new Error(err.error || 'Failed to fetch tracking stats');
  }
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { totalSent: 0, totalOpened: 0, opens: 0, clicks: 0, openRate: 0 }; }
}

export async function fetchEmailEvents(limit = 50) {
  const res = await fetch(`${API_BASE}/api/features/email-events?limit=${limit}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch email events' }));
    throw new Error(err.error || 'Failed to fetch email events');
  }
  const text = await res.text();
  try { return JSON.parse(text); } catch { return []; }
}

// ──────────────────────────────────────────────
// FOLLOW-UP SEQUENCES
// ──────────────────────────────────────────────

export async function fetchSequences() {
  const res = await fetch(`${API_BASE}/api/features/sequences`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch sequences' }));
    throw new Error(err.error || 'Failed to fetch sequences');
  }
  return res.json();
}

export async function createSequence(sequence) {
  const res = await fetch(`${API_BASE}/api/features/sequences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sequence),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create sequence' }));
    throw new Error(err.error || 'Failed to create sequence');
  }
  return res.json();
}

export async function updateSequence(id, updates) {
  const res = await fetch(`${API_BASE}/api/features/sequences/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update sequence' }));
    throw new Error(err.error || 'Failed to update sequence');
  }
  return res.json();
}

export async function deleteSequence(id) {
  const res = await fetch(`${API_BASE}/api/features/sequences/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete sequence' }));
    throw new Error(err.error || 'Failed to delete sequence');
  }
  return res.json();
}

// ──────────────────────────────────────────────
// EMAIL TEMPLATES
// ──────────────────────────────────────────────

export async function fetchTemplates({ category } = {}) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  const res = await fetch(`${API_BASE}/api/templates?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch templates' }));
    throw new Error(err.error || 'Failed to fetch templates');
  }
  return res.json();
}

export async function fetchTemplateById(id) {
  const res = await fetch(`${API_BASE}/api/templates/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Template not found' }));
    throw new Error(err.error || 'Template not found');
  }
  return res.json();
}

export async function createTemplate({ name, subject, body, category, tone }) {
  const res = await fetch(`${API_BASE}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, subject, body, category, tone }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create template' }));
    throw new Error(err.error || 'Failed to create template');
  }
  return res.json();
}

export async function updateTemplate(id, { name, subject, body, category, tone }) {
  const res = await fetch(`${API_BASE}/api/templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, subject, body, category, tone }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update template' }));
    throw new Error(err.error || 'Failed to update template');
  }
  return res.json();
}

export async function deleteTemplate(id) {
  const res = await fetch(`${API_BASE}/api/templates/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete template' }));
    throw new Error(err.error || 'Failed to delete template');
  }
  return res.json();
}

export async function seedTemplates() {
  const res = await fetch(`${API_BASE}/api/templates/seed`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to seed templates' }));
    throw new Error(err.error || 'Failed to seed templates');
  }
  return res.json();
}

export async function generateAITemplate({ category, tone }) {
  const res = await fetch(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Generate an email template for category "${category}" with tone "${tone}". Return ONLY valid JSON (no markdown): {"name":"...","subject":"...","body":"..."}. Use {{name}} and {{company}} as placeholders. Keep body under 100 words.`,
      context: 'Email template generation',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'AI generation failed' }));
    throw new Error(err.error || 'AI generation failed');
  }
  return res.json();
}

// ──────────────────────────────────────────────
// LEAD SCORING
// ──────────────────────────────────────────────

export async function fetchLeadsForScoring() {
  const res = await fetch(`${API_BASE}/api/leads?limit=10000`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch leads' }));
    throw new Error(err.error || 'Failed to fetch leads');
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.leads || [];
}

export async function scoreLeadById(id) {
  const res = await fetch(`${API_BASE}/api/features/lead-score/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to score lead' }));
    throw new Error(err.error || 'Failed to score lead');
  }
  return res.json();
}

export async function scoreAllLeads() {
  const res = await fetch(`${API_BASE}/api/features/lead-score-bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Bulk scoring failed' }));
    throw new Error(err.error || 'Bulk scoring failed');
  }
  return res.json();
}
