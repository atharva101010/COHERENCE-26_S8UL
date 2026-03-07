import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FlaskConical, Plus, Trash2, Play, Pause, X, Sparkles, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchABTests, createABTest, updateABTest, deleteABTest, chatWithAI } from '../lib/supabaseService';
import { safeJsonParse } from '../lib/utils';

const EMPTY_FORM = { name: '', variant_a_subject: '', variant_a_body: '', variant_b_subject: '', variant_b_body: '', split_ratio: 50 };

const fmt = (n) => Number(n || 0).toLocaleString();

export default function ABTesting() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchABTests();
      setTests(data);
    } catch (err) {
      setError(err.message || 'Failed to load A/B tests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error('Test name is required');
    setSubmitting(true);
    try {
      await createABTest(form);
      toast.success('A/B test created');
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to create test');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (test) => {
    const newStatus = test.status === 'running' ? 'paused' : 'running';
    setTogglingId(test.id);
    try {
      await updateABTest(test.id, { status: newStatus });
      toast.success(`Test ${newStatus}`);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteABTest(id);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const getWinRate = (a, b) => {
    const total = (a || 0) + (b || 0);
    if (total === 0) return { a: 50, b: 50 };
    return { a: Math.round(((a || 0) / total) * 100), b: Math.round(((b || 0) / total) * 100) };
  };

  const generateAIVariants = async () => {
    if (!form.name.trim()) return toast.error('Enter a test name first (e.g., "Cold outreach for SaaS CTOs")');
    setAiGenerating(true);
    try {
      const data = await chatWithAI({
        message: `Generate two A/B test email variants for: "${form.name}". Return ONLY valid JSON in this exact format (no markdown): {"variant_a_subject":"...","variant_a_body":"...","variant_b_subject":"...","variant_b_body":"..."}. Variant A should be professional, Variant B should be casual and friendly. Keep bodies under 150 words each.`,
        context: 'A/B testing email variant generation',
      });
      const jsonMatch = /\{[\s\S]*\}/.exec(data.reply);
      if (jsonMatch) {
        const parsed = safeJsonParse(jsonMatch[0], null);
        setForm(prev => ({
          ...prev,
          variant_a_subject: parsed.variant_a_subject || prev.variant_a_subject,
          variant_a_body: parsed.variant_a_body || prev.variant_a_body,
          variant_b_subject: parsed.variant_b_subject || prev.variant_b_subject,
          variant_b_body: parsed.variant_b_body || prev.variant_b_body,
        }));
        toast.success('AI variants generated!');
      } else {
        toast.error('AI response was not in expected format');
      }
    } catch (err) {
      toast.error(err.message || 'AI generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><FlaskConical className="text-primary" /> A/B Testing</h1>
          <p className="text-sm text-muted-foreground mt-1">Test email variants for better conversion</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="p-2 rounded-lg hover:bg-muted disabled:opacity-50" title="Refresh">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowForm(true)} className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-1.5"><Plus size={14} /> New Test</button>
        </div>
      </div>

      {showForm && (
        <div role="dialog" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !submitting && setShowForm(false)} onKeyDown={e => e.key === 'Escape' && !submitting && setShowForm(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl space-y-4 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">New A/B Test</h2>
              <div className="flex items-center gap-2">
                <button onClick={generateAIVariants} disabled={aiGenerating || submitting} className="px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1">
                  {aiGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI Generate
                </button>
                <button onClick={() => setShowForm(false)} disabled={submitting}><X size={18} /></button>
              </div>
            </div>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Test name" className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" disabled={submitting} />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400">Variant A</h3>
                <input value={form.variant_a_subject} onChange={e => setForm({...form, variant_a_subject: e.target.value})} placeholder="Subject A" className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" disabled={submitting} />
                <textarea value={form.variant_a_body} onChange={e => setForm({...form, variant_a_body: e.target.value})} placeholder="Email body A" rows={4} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none" disabled={submitting} />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400">Variant B</h3>
                <input value={form.variant_b_subject} onChange={e => setForm({...form, variant_b_subject: e.target.value})} placeholder="Subject B" className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" disabled={submitting} />
                <textarea value={form.variant_b_body} onChange={e => setForm({...form, variant_b_body: e.target.value})} placeholder="Email body B" rows={4} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none" disabled={submitting} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="split-ratio" className="text-sm text-muted-foreground">Split Ratio (A%)</label>
              <input id="split-ratio" type="range" min={10} max={90} value={form.split_ratio} onChange={e => setForm({...form, split_ratio: Number(e.target.value)})} className="flex-1" disabled={submitting} />
              <span className="text-sm font-mono w-20 text-center">{form.split_ratio}% / {100 - form.split_ratio}%</span>
            </div>

            <button onClick={handleCreate} disabled={submitting} className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Creating...' : 'Create A/B Test'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">{[1,2].map(i => <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : error ? (
        <div className="text-center py-16">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={load} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 inline-flex items-center gap-1.5">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FlaskConical size={48} className="mx-auto mb-4 opacity-30" />
          <p>No A/B tests yet. Create your first test to optimize email performance.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map(test => {
            const openRate = getWinRate(test.variant_a_opened, test.variant_b_opened);
            const statusClass = test.status === 'running' ? 'bg-green-100 text-green-700 dark:text-green-300' : test.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400';
            return (
              <div key={test.id} className="bg-card border border-border rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground">{test.name}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${statusClass}`}>{test.status}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => toggleStatus(test)} disabled={togglingId === test.id} className="p-1.5 rounded hover:bg-muted disabled:opacity-50">
                      {togglingId === test.id ? <Loader2 size={14} className="animate-spin" /> : test.status === 'running' ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button onClick={() => handleDelete(test.id)} disabled={deletingId === test.id} className="p-1.5 rounded hover:bg-red-50 dark:bg-red-900/30 text-red-500 disabled:opacity-50">
                      {deletingId === test.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-900/30 dark:bg-blue-950/30 rounded-lg">
                    <p className="font-semibold text-blue-600 dark:text-blue-400 text-xs">Variant A ({test.split_ratio || 50}%)</p>
                    <p className="text-xs text-muted-foreground truncate">Subject: {test.variant_a_subject || '\u2014'}</p>
                    <div className="flex gap-3 text-xs mt-2">
                      <span>Sent: <b>{fmt(test.variant_a_sent)}</b></span>
                      <span>Opened: <b>{fmt(test.variant_a_opened)}</b></span>
                      <span>Clicked: <b>{fmt(test.variant_a_clicked)}</b></span>
                    </div>
                  </div>
                  <div className="space-y-2 p-3 bg-purple-50 dark:bg-purple-900/30 dark:bg-purple-950/30 rounded-lg">
                    <p className="font-semibold text-purple-600 dark:text-purple-400 text-xs">Variant B ({100 - (test.split_ratio || 50)}%)</p>
                    <p className="text-xs text-muted-foreground truncate">Subject: {test.variant_b_subject || '\u2014'}</p>
                    <div className="flex gap-3 text-xs mt-2">
                      <span>Sent: <b>{fmt(test.variant_b_sent)}</b></span>
                      <span>Opened: <b>{fmt(test.variant_b_opened)}</b></span>
                      <span>Clicked: <b>{fmt(test.variant_b_clicked)}</b></span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground"><span>Open Rate</span><span>A: {openRate.a}% | B: {openRate.b}%</span></div>
                  <div className="flex h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 transition-all" style={{ width: `${openRate.a}%` }} />
                    <div className="bg-purple-500 transition-all" style={{ width: `${openRate.b}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
