import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Webhook, Plus, Trash2, X, Send, Zap, CheckCircle, XCircle, AlertCircle, RefreshCw, Loader2, Globe } from 'lucide-react';
import {
  fetchWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhookAPI,
  testWebhookAPI,
} from '../lib/supabaseService';

const EVENT_TYPES = ['lead.created', 'lead.updated', 'execution.started', 'execution.completed', 'message.sent', 'message.opened'];

const EVENT_LABELS = {
  'lead.created': 'Lead Created',
  'lead.updated': 'Lead Updated',
  'execution.started': 'Execution Started',
  'execution.completed': 'Execution Completed',
  'message.sent': 'Message Sent',
  'message.opened': 'Message Opened',
};

function SkeletonWebhookCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-zinc-200" />
          <div className="h-4 bg-zinc-200 rounded w-32" />
          <div className="h-4 bg-zinc-200 rounded w-48" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-6 w-14 bg-zinc-200 rounded" />
          <div className="h-6 w-6 bg-zinc-200 rounded" />
          <div className="h-6 w-6 bg-zinc-200 rounded" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-4 w-20 bg-zinc-200 rounded-full" />
        <div className="h-4 w-24 bg-zinc-200 rounded-full" />
      </div>
      <div className="h-3 bg-zinc-200 rounded w-36" />
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="border border-red-300 bg-red-50 dark:bg-red-900/30 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
        <AlertCircle size={16} />
        <span>{message}</span>
      </div>
      <button onClick={onRetry} className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1">
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState(null);
  const [form, setForm] = useState({ name: '', url: '', events: ['lead.created', 'execution.completed'] });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWebhooks();
      setWebhooks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleEvent = (event) => {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  };

  const handleCreate = async () => {
    const name = form.name.trim();
    const url = form.url.trim();
    if (!name) return toast.error('Webhook name is required');
    if (!url) return toast.error('Webhook URL is required');
    try {
      new URL(url);
    } catch {
      return toast.error('Enter a valid URL (must start with http:// or https://)');
    }
    if (form.events.length === 0) return toast.error('Select at least one event');

    setCreating(true);
    try {
      const data = await createWebhook({ name, url, events: form.events });
      setWebhooks(prev => [data, ...prev]);
      setShowForm(false);
      setForm({ name: '', url: '', events: ['lead.created', 'execution.completed'] });
      toast.success(`Webhook "${name}" created`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleTest = async (id) => {
    setTesting(id);
    try {
      const data = await testWebhookAPI(id);
      if (data.success) {
        toast.success(`Test successful (HTTP ${data.statusCode})`);
      } else {
        toast.error(`Test failed: ${data.statusText || 'Unknown error'}`);
      }
      setWebhooks(prev => prev.map(wh =>
        wh.id === id
          ? { ...wh, last_triggered: new Date().toISOString(), trigger_count: (wh.trigger_count || 0) + 1 }
          : wh
      ));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTesting(null);
    }
  };

  const handleToggleActive = async (wh) => {
    const newActive = !wh.is_active;
    setWebhooks(prev => prev.map(w => w.id === wh.id ? { ...w, is_active: newActive } : w));
    try {
      await updateWebhook(wh.id, { is_active: newActive });
      toast.success(newActive ? `"${wh.name}" enabled` : `"${wh.name}" disabled`);
    } catch (err) {
      setWebhooks(prev => prev.map(w => w.id === wh.id ? { ...w, is_active: wh.is_active } : w));
      toast.error(err.message);
    }
  };

  const handleDelete = async (wh) => {
    try {
      await deleteWebhookAPI(wh.id);
      setWebhooks(prev => prev.filter(w => w.id !== wh.id));
      toast.success(`"${wh.name}" deleted`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Webhook className="text-primary" /> Webhooks & Zapier
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Connect FlowReach to external services</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent flex items-center gap-1.5">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowForm(true)} className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-1.5">
            <Plus size={14} /> New Webhook
          </button>
        </div>
      </div>

      {/* Quick Start */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <Zap size={18} className="text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Zapier / Make Integration</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create a webhook URL in Zapier or Make.com, then paste it here. FlowReach will send events
            to your automation whenever leads are created, emails are sent, or workflows complete.
          </p>
        </div>
      </div>

      {/* Error state */}
      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Globe size={18} className="text-primary" /> New Webhook
              </h2>
              <button onClick={() => !creating && setShowForm(false)} disabled={creating}>
                <X size={18} />
              </button>
            </div>

            <div>
              <label htmlFor="wh-name" className="text-xs font-medium text-muted-foreground">Webhook Name</label>
              <input
                id="wh-name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Zapier Lead Sync"
                className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                disabled={creating}
              />
            </div>

            <div>
              <label htmlFor="wh-url" className="text-xs font-medium text-muted-foreground">Endpoint URL</label>
              <input
                id="wh-url"
                value={form.url}
                onChange={e => setForm({ ...form, url: e.target.value })}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono text-xs"
                disabled={creating}
              />
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Subscribe to Events</p>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map(event => (
                  <button
                    key={event}
                    onClick={() => toggleEvent(event)}
                    disabled={creating}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                      form.events.includes(event)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-muted-foreground hover:border-primary'
                    } disabled:opacity-50`}
                  >
                    {EVENT_LABELS[event] || event}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : 'Create Webhook'}
            </button>
          </div>
        </div>
      )}

      {/* Webhooks List */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonWebhookCard />
          <SkeletonWebhookCard />
          <SkeletonWebhookCard />
        </div>
      ) : !error && webhooks.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Webhook size={48} className="mx-auto mb-4 text-muted-foreground opacity-40" />
          <p className="text-sm font-medium text-foreground">No webhooks configured</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Connect FlowReach to Zapier, Make.com, or any service that accepts webhooks
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> Create First Webhook
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(wh => {
            const events = Array.isArray(wh.events) ? wh.events : [];
            return (
              <div key={wh.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${wh.is_active ? 'bg-green-500' : 'bg-zinc-300'}`} />
                    <h3 className="font-semibold text-sm truncate">{wh.name}</h3>
                    <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded truncate max-w-[300px]">
                      {wh.url}
                    </span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handleTest(wh.id)}
                      disabled={testing === wh.id}
                      className="px-2.5 py-1 text-xs bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 flex items-center gap-1 disabled:opacity-50"
                    >
                      {testing === wh.id ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                      {testing === wh.id ? 'Testing...' : 'Test'}
                    </button>
                    <button
                      onClick={() => handleToggleActive(wh)}
                      className="p-1.5 rounded hover:bg-muted"
                      title={wh.is_active ? 'Disable webhook' : 'Enable webhook'}
                    >
                      {wh.is_active
                        ? <CheckCircle size={14} className="text-green-600 dark:text-green-400" />
                        : <XCircle size={14} className="text-zinc-400" />
                      }
                    </button>
                    <button
                      onClick={() => handleDelete(wh)}
                      className="p-1.5 rounded hover:bg-red-50 dark:bg-red-900/30 text-red-500"
                      title="Delete webhook"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {events.map(e => (
                    <span key={e} className="px-2 py-0.5 text-[10px] bg-primary/10 text-primary rounded-full font-medium">
                      {EVENT_LABELS[e] || e}
                    </span>
                  ))}
                  {events.length === 0 && (
                    <span className="text-[10px] text-muted-foreground">No events subscribed</span>
                  )}
                </div>

                <div className="flex gap-4 text-[10px] text-muted-foreground">
                  <span>Triggered {(wh.trigger_count || 0).toLocaleString()} time{wh.trigger_count === 1 ? '' : 's'}</span>
                  {wh.last_triggered && <span>Last: {formatTime(wh.last_triggered)}</span>}
                  <span className={`font-medium ${wh.is_active ? 'text-green-600 dark:text-green-400' : 'text-zinc-400'}`}>
                    {wh.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
