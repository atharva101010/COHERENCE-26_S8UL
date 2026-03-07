import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FileText, Plus, Trash2, Copy, Edit3, Bookmark, X, Sparkles, Search, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { safeJsonParse } from '../lib/utils';
import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  seedTemplates,
  generateAITemplate,
} from '../lib/supabaseService';

const CATEGORIES = ['Cold Outreach', 'Follow-Up', 'Meeting Request', 'Re-engagement', 'Thank You', 'Product Launch', 'General'];

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', subject: '', body: '', category: 'General', tone: 'professional' });
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTemplates(category ? { category } : {});
      setTemplates(data);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [category]);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Template name is required');
    if (!form.body.trim()) return toast.error('Template body is required');
    setSaving(true);
    try {
      if (editing) {
        await updateTemplate(editing, form);
        toast.success('Template updated successfully');
      } else {
        await createTemplate(form);
        toast.success('Template created successfully');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', subject: '', body: '', category: 'General', tone: 'professional' });
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete template "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteTemplate(id);
      toast.success('Template deleted');
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await seedTemplates();
      toast.success(`Loaded ${result.seeded} default templates`);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSeeding(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleAIGenerate = async () => {
    setAiGenerating(true);
    try {
      const data = await generateAITemplate({ category: form.category, tone: form.tone });
      const jsonMatch = /\{[\s\S]*\}/.exec(data.reply);
      if (jsonMatch) {
        const parsed = safeJsonParse(jsonMatch[0], null);
        setForm(prev => ({
          ...prev,
          name: parsed.name || prev.name,
          subject: parsed.subject || prev.subject,
          body: parsed.body || prev.body,
        }));
        toast.success('AI template generated!');
      } else {
        toast.error('AI response was not in expected format');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAiGenerating(false);
    }
  };

  const filtered = templates.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.subject?.toLowerCase().includes(search.toLowerCase()) ||
    t.body?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><FileText className="text-primary" /> Email Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">{templates.length} template{templates.length !== 1 ? 's' : ''} available</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSeed} disabled={seeding} className="px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 flex items-center gap-1.5">
            {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Load Defaults
          </button>
          <button onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', subject: '', body: '', category: 'General', tone: 'professional' }); }} className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-1.5"><Plus size={14} /> New Template</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-lg bg-background">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={load} disabled={loading} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50" title="Refresh">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div role="dialog" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !saving && setShowForm(false)} onKeyDown={e => e.key === 'Escape' && !saving && setShowForm(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Template' : 'New Template'}</h2>
              <div className="flex items-center gap-2">
                <button onClick={handleAIGenerate} disabled={aiGenerating || saving} className="px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1">
                  {aiGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI Generate
                </button>
                <button onClick={() => setShowForm(false)} disabled={saving}><X size={18} /></button>
              </div>
            </div>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Template name" className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" />
            <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="Email subject line" className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" />
            <textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})} placeholder="Email body (use {{name}}, {{company}} for variables)" rows={6} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none" />
            <div className="flex gap-3">
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={form.tone} onChange={e => setForm({...form, tone: e.target.value})} className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background">
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
              </select>
            </div>
            <button onClick={handleSave} disabled={saving} className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editing ? 'Update' : 'Create'} Template
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="border border-red-300 bg-red-50 dark:bg-red-900/30 rounded-xl p-6 flex items-center gap-4">
          <AlertCircle className="text-red-500 shrink-0" size={24} />
          <div className="flex-1">
            <p className="font-medium text-red-800 dark:text-red-300">Failed to load templates</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
          </div>
          <button onClick={load} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1.5">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Templates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex justify-between"><div className="h-4 w-32 bg-muted animate-pulse rounded" /><div className="h-4 w-16 bg-muted animate-pulse rounded-full" /></div>
              <div className="h-3 w-48 bg-muted animate-pulse rounded" />
              <div className="space-y-1.5"><div className="h-3 w-full bg-muted animate-pulse rounded" /><div className="h-3 w-3/4 bg-muted animate-pulse rounded" /><div className="h-3 w-1/2 bg-muted animate-pulse rounded" /></div>
              <div className="flex justify-between pt-2 border-t border-border"><div className="h-3 w-20 bg-muted animate-pulse rounded" /><div className="h-5 w-16 bg-muted animate-pulse rounded" /></div>
            </div>
          ))}
        </div>
      ) : !error && filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium">No templates found</p>
          <p className="text-sm mt-1 mb-4">Create your first template or load the defaults to get started.</p>
          <div className="flex gap-2 justify-center">
            <button onClick={handleSeed} disabled={seeding} className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 flex items-center gap-1.5">
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Load Defaults
            </button>
            <button onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', subject: '', body: '', category: 'General', tone: 'professional' }); }} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-1.5">
              <Plus size={14} /> New Template
            </button>
          </div>
        </div>
      ) : !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="bg-card border border-border rounded-xl p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-sm text-foreground">{t.name}</h3>
                <span className="px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">{t.category}</span>
              </div>
              {t.subject && <p className="text-xs text-muted-foreground font-medium">Subject: {t.subject}</p>}
              <p className="text-xs text-muted-foreground line-clamp-3">{t.body}</p>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-[10px] text-muted-foreground capitalize flex items-center gap-1"><Bookmark size={10} /> {t.tone}</span>
                <div className="flex gap-1">
                  <button onClick={() => copyToClipboard(t.body)} className="p-1.5 rounded hover:bg-muted" title="Copy body"><Copy size={13} /></button>
                  <button onClick={() => { setEditing(t.id); setForm({ name: t.name, subject: t.subject || '', body: t.body, category: t.category || 'General', tone: t.tone || 'professional' }); setShowForm(true); }} className="p-1.5 rounded hover:bg-muted" title="Edit"><Edit3 size={13} /></button>
                  <button onClick={() => handleDelete(t.id, t.name)} disabled={deletingId === t.id} className="p-1.5 rounded hover:bg-red-50 dark:bg-red-900/30 text-red-500 disabled:opacity-50" title="Delete">
                    {deletingId === t.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
