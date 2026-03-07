import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Repeat, Plus, Trash2, X, Clock, Play, Pause, ArrowRight, Sparkles, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchSequences, createSequence, updateSequence, deleteSequence, chatWithAI } from '../lib/supabaseService';
import { safeJsonParse } from '../lib/utils';

const EMPTY_FORM = { name: '', trigger_condition: 'no_reply', max_attempts: 3, steps: [{ delay_hours: 24, action: 'send_email', subject: '', body: '' }] };

const fmt = (n) => Number(n || 0).toLocaleString();

const TRIGGER_LABELS = { no_reply: 'No Reply', no_open: 'No Open', bounced: 'Email Bounced' };

export default function FollowUpSequences() {
  const [sequences, setSequences] = useState([]);
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
      const data = await fetchSequences();
      setSequences(data);
    } catch (err) {
      setError(err.message || 'Failed to load sequences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addStep = () => {
    setForm({ ...form, steps: [...form.steps, { delay_hours: 48, action: 'send_email', subject: '', body: '' }] });
  };

  const removeStep = (idx) => {
    setForm({ ...form, steps: form.steps.filter((_, i) => i !== idx) });
  };

  const updateStep = (idx, field, value) => {
    const steps = [...form.steps];
    steps[idx] = { ...steps[idx], [field]: value };
    setForm({ ...form, steps });
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error('Sequence name is required');
    setSubmitting(true);
    try {
      await createSequence(form);
      toast.success('Sequence created');
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to create sequence');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (seq) => {
    const newStatus = seq.status === 'active' ? 'paused' : 'active';
    setTogglingId(seq.id);
    try {
      await updateSequence(seq.id, { status: newStatus });
      toast.success(`Sequence ${newStatus}`);
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
      await deleteSequence(id);
      toast.success('Sequence deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const generateAISequence = async () => {
    setAiGenerating(true);
    try {
      const triggerDescs = { no_reply: "leads who haven't replied", no_open: "leads who haven't opened emails" };
      const triggerDesc = triggerDescs[form.trigger_condition] || 'bounced emails';
      const data = await chatWithAI({
        message: `Generate a 3-step follow-up email sequence for ${triggerDesc}. Return ONLY valid JSON (no markdown): {"name":"...","steps":[{"delay_hours":24,"action":"send_email","subject":"...","body":"..."},{"delay_hours":72,"action":"send_email","subject":"...","body":"..."},{"delay_hours":168,"action":"send_email","subject":"...","body":"..."}]}. Use {{name}} and {{company}} placeholders. Keep each body under 80 words.`,
        context: 'Follow-up sequence generation',
      });
      const jsonMatch = /\{[\s\S]*\}/.exec(data.reply);
      if (jsonMatch) {
        const parsed = safeJsonParse(jsonMatch[0], null);
        setForm(prev => ({
          ...prev,
          name: parsed.name || prev.name,
          steps: parsed.steps || prev.steps,
        }));
        toast.success('AI sequence generated!');
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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Repeat className="text-primary" /> Follow-Up Sequences</h1>
          <p className="text-sm text-muted-foreground mt-1">Automate multi-step follow-up campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="p-2 rounded-lg hover:bg-muted disabled:opacity-50" title="Refresh">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowForm(true)} className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-1.5"><Plus size={14} /> New Sequence</button>
        </div>
      </div>

      {showForm && (
        <div role="dialog" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !submitting && setShowForm(false)} onKeyDown={e => e.key === 'Escape' && !submitting && setShowForm(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl space-y-4 shadow-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">New Follow-Up Sequence</h2>
              <div className="flex items-center gap-2">
                <button onClick={generateAISequence} disabled={aiGenerating || submitting} className="px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1">
                  {aiGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI Generate
                </button>
                <button onClick={() => setShowForm(false)} disabled={submitting}><X size={18} /></button>
              </div>
            </div>
            
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Sequence name" className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" disabled={submitting} />
            
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="trigger-condition" className="text-xs text-muted-foreground mb-1 block">Trigger When</label>
                <select id="trigger-condition" value={form.trigger_condition} onChange={e => setForm({...form, trigger_condition: e.target.value})} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" disabled={submitting}>
                  <option value="no_reply">No Reply</option>
                  <option value="no_open">No Open</option>
                  <option value="bounced">Email Bounced</option>
                </select>
              </div>
              <div className="w-32">
                <label htmlFor="max-attempts" className="text-xs text-muted-foreground mb-1 block">Max Attempts</label>
                <input id="max-attempts" type="number" min={1} max={10} value={form.max_attempts} onChange={e => setForm({...form, max_attempts: Number(e.target.value)})} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" disabled={submitting} />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Steps</h3>
              {form.steps.map((step, idx) => (
                <div key={`step-${idx}`} className="bg-muted/50 rounded-lg p-3 space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary">Step {idx + 1}</span>
                    {form.steps.length > 1 && <button onClick={() => removeStep(idx)} disabled={submitting} className="text-red-500 disabled:opacity-50"><Trash2 size={12} /></button>}
                  </div>
                  <div className="flex gap-2">
                    <div className="w-28">
                      <label htmlFor={`delay-${idx}`} className="text-[10px] text-muted-foreground">Delay (hours)</label>
                      <input id={`delay-${idx}`} type="number" min={1} value={step.delay_hours} onChange={e => updateStep(idx, 'delay_hours', Number(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background" disabled={submitting} />
                    </div>
                    <div className="flex-1">
                      <label htmlFor={`subject-${idx}`} className="text-[10px] text-muted-foreground">Subject</label>
                      <input id={`subject-${idx}`} value={step.subject} onChange={e => updateStep(idx, 'subject', e.target.value)} placeholder="Follow-up subject" className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background" disabled={submitting} />
                    </div>
                  </div>
                  <textarea value={step.body} onChange={e => updateStep(idx, 'body', e.target.value)} placeholder="Follow-up message body" rows={2} className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background resize-none" disabled={submitting} />
                </div>
              ))}
              <button onClick={addStep} disabled={submitting} className="w-full py-1.5 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 disabled:opacity-50 flex items-center justify-center gap-1"><Plus size={12} /> Add Step</button>
            </div>

            <button onClick={handleCreate} disabled={submitting} className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Creating...' : 'Create Sequence'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : error ? (
        <div className="text-center py-16">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={load} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 inline-flex items-center gap-1.5">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : sequences.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Repeat size={48} className="mx-auto mb-4 opacity-30" />
          <p>No follow-up sequences yet. Create one to automate re-engagement.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sequences.map(seq => {
            const steps = Array.isArray(seq.steps) ? seq.steps : [];
            const statusClass = seq.status === 'active' ? 'bg-green-100 text-green-700 dark:text-green-300' : 'bg-yellow-100 text-yellow-700';
            return (
              <div key={seq.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground">{seq.name}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${statusClass}`}>{seq.status}</span>
                    <span className="text-xs text-muted-foreground">Trigger: {TRIGGER_LABELS[seq.trigger_condition] || seq.trigger_condition}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => toggleStatus(seq)} disabled={togglingId === seq.id} className="p-1.5 rounded hover:bg-muted disabled:opacity-50">
                      {togglingId === seq.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : (seq.status === 'active' ? <Pause size={14} /> : <Play size={14} />)
                      }
                    </button>
                    <button onClick={() => handleDelete(seq.id)} disabled={deletingId === seq.id} className="p-1.5 rounded hover:bg-red-50 dark:bg-red-900/30 text-red-500 disabled:opacity-50">
                      {deletingId === seq.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  {steps.map((step, idx) => (
                    <div key={`timeline-${idx}`} className="flex items-center gap-1">
                      <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
                        <Clock size={10} /> {step.delay_hours}h \u2192 {step.action === 'send_email' ? 'Email' : (step.action || 'Email')}
                      </div>
                      {idx < steps.length - 1 && <ArrowRight size={12} className="text-muted-foreground" />}
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{steps.length} steps</span>
                  <span>Max {seq.max_attempts} attempts</span>
                  <span>Enrolled: {fmt(seq.enrolled_count)}</span>
                  <span>Completed: {fmt(seq.completed_count)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
