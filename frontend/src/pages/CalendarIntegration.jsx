import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, Plus, Trash2, X, ExternalLink, Copy, Clock, Video, Loader2, Sparkles, RefreshCw, AlertCircle, Edit2, Check } from 'lucide-react';
import { fetchBookingLinks, createBookingLink, updateBookingLink, deleteBookingLink, chatWithAI } from '../lib/supabaseService';

const CALENDAR_PROVIDERS = [
  { id: 'google', name: 'Google Calendar', icon: '📅', color: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' },
  { id: 'outlook', name: 'Outlook Calendar', icon: '📆', color: 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800' },
  { id: 'calendly', name: 'Calendly', icon: '🗓️', color: 'bg-green-50 dark:bg-green-900/30 border-green-200' },
];

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-200" />
        <div>
          <div className="h-4 w-36 bg-zinc-200 rounded mb-2" />
          <div className="h-3 w-48 bg-zinc-100 dark:bg-zinc-800 rounded" />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-6 w-14 bg-zinc-200 rounded-full" />
        <div className="h-6 w-6 bg-zinc-100 dark:bg-zinc-800 rounded" />
        <div className="h-6 w-6 bg-zinc-100 dark:bg-zinc-800 rounded" />
      </div>
    </div>
  );
}

export default function CalendarIntegration() {
  const [bookingLinks, setBookingLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', duration: 30, url: '', provider: 'calendly' });
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', duration: 30, url: '', provider: 'calendly' });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const loadBookingLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBookingLinks();
      setBookingLinks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBookingLinks(); }, [loadBookingLinks]);

  const handleAddBookingLink = async () => {
    if (!form.name.trim()) return toast.error('Meeting name is required');
    if (form.url.trim()) {
      try {
        const parsed = new URL(form.url.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) return toast.error('URL must use http or https');
      } catch {
        return toast.error('Invalid booking URL format');
      }
    }
    setSubmitting(true);
    try {
      const data = await createBookingLink(form);
      setBookingLinks(prev => [data, ...prev]);
      setShowForm(false);
      setForm({ name: '', duration: 30, url: '', provider: 'calendly' });
      toast.success('Booking link created successfully');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveLink = async (id) => {
    setDeletingId(id);
    try {
      await deleteBookingLink(id);
      setBookingLinks(prev => prev.filter(l => l.id !== id));
      toast.success('Booking link removed');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (id) => {
    const link = bookingLinks.find(l => l.id === id);
    if (!link) return;
    setTogglingId(id);
    try {
      const updated = await updateBookingLink(id, { is_active: !link.is_active });
      setBookingLinks(prev => prev.map(l => l.id === id ? { ...l, is_active: updated.is_active } : l));
      toast.success(updated.is_active ? 'Booking link activated' : 'Booking link deactivated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const startEditing = (link) => {
    setEditingId(link.id);
    setEditForm({ name: link.name, duration: link.duration, url: link.url || '', provider: link.provider });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ name: '', duration: 30, url: '', provider: 'calendly' });
  };

  const handleSaveEdit = async (id) => {
    if (!editForm.name.trim()) return toast.error('Meeting name is required');
    if (editForm.url.trim()) {
      try {
        const parsed = new URL(editForm.url.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) return toast.error('URL must use http or https');
      } catch {
        return toast.error('Invalid booking URL format');
      }
    }
    setEditSubmitting(true);
    try {
      const updated = await updateBookingLink(id, editForm);
      setBookingLinks(prev => prev.map(l => l.id === id ? { ...l, ...updated } : l));
      setEditingId(null);
      toast.success('Booking link updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const copyLink = (url) => {
    if (!url) return toast.error('No URL configured for this booking link');
    navigator.clipboard.writeText(url);
    toast.success('Booking link copied to clipboard');
  };

  const getAISuggestion = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const data = await chatWithAI({
        message: `I have ${bookingLinks.length} booking links set up for outreach (${bookingLinks.map(l => `${l.name} - ${l.duration}min via ${l.provider}`).join(', ') || 'none yet'}). Suggest the ideal meeting types and durations for a B2B lead outreach workflow. Keep it to 3 sentences.`,
        context: 'Calendar integration page — helping user optimize their booking link strategy',
      });
      setAiSuggestion(data.reply);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const activeCount = bookingLinks.filter(l => l.is_active).length;
  const providerCounts = bookingLinks.reduce((acc, l) => {
    acc[l.provider] = (acc[l.provider] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-56 bg-zinc-200 rounded animate-pulse" />
            <div className="h-4 w-72 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse mt-2" />
          </div>
          <div className="h-9 w-36 bg-zinc-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="border rounded-xl p-4 flex items-center gap-3 animate-pulse bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
              <div className="w-8 h-8 bg-zinc-200 rounded" />
              <div><div className="h-4 w-28 bg-zinc-200 rounded mb-1" /><div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-800 rounded" /></div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-5 w-32 bg-zinc-200 rounded animate-pulse" />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="border border-red-300 bg-red-50 dark:bg-red-900/30 rounded-xl p-6 text-center">
          <AlertCircle size={40} className="mx-auto mb-3 text-red-400" />
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-1">Failed to load booking links</h2>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={loadBookingLinks} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 inline-flex items-center gap-1.5">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><CalendarDays className="text-primary" /> Calendar Integration</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage booking links and calendar connections &mdash; {activeCount} active, {bookingLinks.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadBookingLinks} className="p-2 rounded-lg border border-border hover:bg-muted" title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setShowForm(true)} className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-1.5">
            <Plus size={14} /> Add Booking Link
          </button>
        </div>
      </div>

      {/* Calendar Providers */}
      <div className="grid grid-cols-3 gap-4">
        {CALENDAR_PROVIDERS.map(cal => (
          <div key={cal.id} className={`border rounded-xl p-4 flex items-center gap-3 ${cal.color}`}>
            <span className="text-2xl">{cal.icon}</span>
            <div>
              <p className="text-sm font-semibold">{cal.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {providerCounts[cal.id] ? `${providerCounts[cal.id]} link${providerCounts[cal.id] > 1 ? 's' : ''} configured` : 'No links yet'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div role="dialog" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !submitting && setShowForm(false)} onKeyDown={e => e.key === 'Escape' && !submitting && setShowForm(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">New Booking Link</h2>
              <button onClick={() => !submitting && setShowForm(false)} disabled={submitting}><X size={18} /></button>
            </div>
            <div>
              <label htmlFor="cal-name" className="text-xs text-muted-foreground mb-1 block">Meeting Name *</label>
              <input id="cal-name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g., 30-Min Product Demo" className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="cal-duration" className="text-xs text-muted-foreground mb-1 block">Duration</label>
                <select id="cal-duration" value={form.duration} onChange={e => setForm({...form, duration: Number(e.target.value)})} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background">
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>
              <div className="flex-1">
                <label htmlFor="cal-provider" className="text-xs text-muted-foreground mb-1 block">Provider</label>
                <select id="cal-provider" value={form.provider} onChange={e => setForm({...form, provider: e.target.value})} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background">
                  {CALENDAR_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="cal-url" className="text-xs text-muted-foreground mb-1 block">Booking URL</label>
              <input id="cal-url" value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://calendly.com/you/30min" className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono text-xs" />
            </div>
            <button onClick={handleAddBookingLink} disabled={submitting || !form.name.trim()} className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5">
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : 'Add Booking Link'}
            </button>
          </div>
        </div>
      )}

      {/* Booking Links List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Booking Links ({bookingLinks.length})</h3>
        {bookingLinks.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <CalendarDays size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground mb-3">No booking links yet. Create your first one to include in outreach emails.</p>
            <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 inline-flex items-center gap-1.5">
              <Plus size={14} /> Create Booking Link
            </button>
          </div>
        ) : (
          bookingLinks.map(link => (
            <div key={link.id} className="bg-card border border-border rounded-xl p-4">
              {editingId === link.id ? (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Meeting name" className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-background" />
                    <select value={editForm.duration} onChange={e => setEditForm({...editForm, duration: Number(e.target.value)})} className="px-2 py-1.5 text-sm border border-border rounded-lg bg-background">
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                    </select>
                    <select value={editForm.provider} onChange={e => setEditForm({...editForm, provider: e.target.value})} className="px-2 py-1.5 text-sm border border-border rounded-lg bg-background">
                      {CALENDAR_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <input value={editForm.url} onChange={e => setEditForm({...editForm, url: e.target.value})} placeholder="https://calendly.com/you/30min" className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background font-mono text-xs" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={cancelEditing} disabled={editSubmitting} className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted">Cancel</button>
                    <button onClick={() => handleSaveEdit(link.id)} disabled={editSubmitting || !editForm.name.trim()} className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1">
                      {editSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Video size={18} className="text-primary" /></div>
                    <div>
                      <p className="text-sm font-semibold">{link.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock size={10} /> {link.duration} min</span>
                        <span className="capitalize">{link.provider}</span>
                        {link.url && <span className="font-mono truncate max-w-[200px]">{link.url}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleActive(link.id)}
                      disabled={togglingId === link.id}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-colors ${link.is_active ? 'bg-green-100 text-green-700 dark:text-green-300' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}
                    >
                      {togglingId === link.id ? <Loader2 size={10} className="animate-spin" /> : link.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => startEditing(link)} className="p-1.5 rounded hover:bg-muted" title="Edit"><Edit2 size={13} /></button>
                    {link.url && <button onClick={() => copyLink(link.url)} className="p-1.5 rounded hover:bg-muted" title="Copy URL"><Copy size={13} /></button>}
                    {link.url && <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-muted" title="Open link"><ExternalLink size={13} /></a>}
                    <button
                      onClick={() => handleRemoveLink(link.id)}
                      disabled={deletingId === link.id}
                      className="p-1.5 rounded hover:bg-red-50 dark:bg-red-900/30 text-red-500"
                      title="Delete"
                    >
                      {deletingId === link.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Usage Info */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-2">Using Calendar Links in Workflows</h3>
        <p className="text-xs text-muted-foreground">
          Add booking links to your AI-generated emails using the variable <code className="px-1 py-0.5 bg-muted rounded text-[10px]">{'{{booking_link}}'}</code>. 
          The system will automatically insert the appropriate calendar link based on the meeting type selected in your workflow node configuration.
        </p>
      </div>

      {/* AI Suggestion */}
      <div className="bg-violet-50 dark:bg-violet-900/30 border border-violet-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-violet-700 dark:text-violet-300"><Sparkles size={14} /> AI Meeting Suggestions</h3>
          <button onClick={getAISuggestion} disabled={aiLoading} className="px-3 py-1 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1">
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} {aiLoading ? 'Thinking...' : 'Get Suggestion'}
          </button>
        </div>
        {aiError ? (
          <div className="flex items-center gap-2">
            <p className="text-xs text-red-600 dark:text-red-400 flex-1">{aiError}</p>
            <button onClick={getAISuggestion} className="text-xs text-violet-700 dark:text-violet-300 underline hover:text-violet-900">Retry</button>
          </div>
        ) : aiSuggestion ? (
          <p className="text-xs text-violet-600 dark:text-violet-400">{aiSuggestion}</p>
        ) : (
          <p className="text-xs text-violet-400">Click &quot;Get Suggestion&quot; for AI-powered advice on optimal meeting types for your outreach.</p>
        )}
      </div>
    </div>
  );
}
