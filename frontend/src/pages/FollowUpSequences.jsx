import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Repeat, Plus, Trash2, X, Clock, Play, Pause, ArrowRight, Sparkles, Loader2, RefreshCw, AlertCircle, Mail, Eye, MessageSquare, Users, TrendingUp, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { fetchSequences, createSequence, updateSequence, deleteSequence, chatWithAI } from '../lib/supabaseService';
import { safeJsonParse } from '../lib/utils';

const EMPTY_FORM = { name: '', trigger_condition: 'no_reply', max_attempts: 3, steps: [{ delay_hours: 24, action: 'send_email', subject: '', body: '' }] };

const fmt = (n) => Number(n || 0).toLocaleString();

const TRIGGER_LABELS = { no_reply: 'No Reply', no_open: 'No Open', bounced: 'Email Bounced' };
const TRIGGER_DESCRIPTIONS = {
  no_reply: 'Triggers when a lead does not reply within the delay window',
  no_open: 'Triggers when an email is not opened within the delay window',
  bounced: 'Triggers when an email delivery bounces back',
};

const ACTION_LABELS = { send_email: 'Send Email', update_status: 'Update Status', send_sms: 'Send SMS', add_tag: 'Add Tag' };
const ACTION_ICONS = { send_email: Mail, update_status: TrendingUp, send_sms: MessageSquare, add_tag: BarChart3 };

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
  const [expandedId, setExpandedId] = useState(null);

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

  // Summary stats
  const totalSequences = sequences.length;
  const activeSequences = sequences.filter(s => s.status === 'active').length;
  const totalEnrolled = sequences.reduce((s, seq) => s + (seq.enrolled_count || 0), 0);
  const totalCompleted = sequences.reduce((s, seq) => s + (seq.completed_count || 0), 0);
  const avgReplyRate = sequences.length > 0
    ? (sequences.reduce((s, seq) => s + (seq.reply_rate || 0), 0) / sequences.length).toFixed(1)
    : 0;
  const avgOpenRate = sequences.length > 0
    ? (sequences.reduce((s, seq) => s + (seq.open_rate || 0), 0) / sequences.length).toFixed(1)
    : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Repeat className="text-primary" /> Follow-Up Sequences</h1>
          <p className="text-sm text-muted-foreground mt-1">Automate multi-step follow-up campaigns with AI-powered content</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="p-2 rounded-lg hover:bg-muted disabled:opacity-50" title="Refresh">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowForm(true)} className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-1.5"><Plus size={14} /> New Sequence</button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      {!loading && !error && sequences.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-card border border-border rounded-xl p-3.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sequences</p>
            <p className="text-xl font-bold mt-1">{totalSequences}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Active</p>
            <p className="text-xl font-bold mt-1 text-green-600 dark:text-green-400">{activeSequences}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Enrolled</p>
            <p className="text-xl font-bold mt-1">{fmt(totalEnrolled)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Completed</p>
            <p className="text-xl font-bold mt-1 text-blue-600 dark:text-blue-400">{fmt(totalCompleted)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Eye size={10} /> Avg Open Rate</p>
            <p className="text-xl font-bold mt-1">{avgOpenRate}%</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><MessageSquare size={10} /> Avg Reply Rate</p>
            <p className="text-xl font-bold mt-1 text-primary">{avgReplyRate}%</p>
          </div>
        </div>
      )}

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
            
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Sequence name (e.g., 'New Lead Nurture')" className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" disabled={submitting} />
            
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="trigger-condition" className="text-xs text-muted-foreground mb-1 block">Trigger When</label>
                <select id="trigger-condition" value={form.trigger_condition} onChange={e => setForm({...form, trigger_condition: e.target.value})} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" disabled={submitting}>
                  <option value="no_reply">No Reply</option>
                  <option value="no_open">No Open</option>
                  <option value="bounced">Email Bounced</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">{TRIGGER_DESCRIPTIONS[form.trigger_condition]}</p>
              </div>
              <div className="w-32">
                <label htmlFor="max-attempts" className="text-xs text-muted-foreground mb-1 block">Max Attempts</label>
                <input id="max-attempts" type="number" min={1} max={10} value={form.max_attempts} onChange={e => setForm({...form, max_attempts: Number(e.target.value)})} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" disabled={submitting} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Steps ({form.steps.length})</h3>
                <span className="text-[10px] text-muted-foreground">Total delay: {form.steps.reduce((s, st) => s + (st.delay_hours || 0), 0)}h</span>
              </div>
              {form.steps.map((step, idx) => (
                <div key={`step-${idx}`} className="bg-muted/50 rounded-lg p-3 space-y-2 relative border-l-2 border-primary/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary">Step {idx + 1}</span>
                      <select value={step.action || 'send_email'} onChange={e => updateStep(idx, 'action', e.target.value)} className="px-2 py-0.5 text-[10px] border border-border rounded bg-background" disabled={submitting}>
                        <option value="send_email">Send Email</option>
                        <option value="update_status">Update Status</option>
                      </select>
                    </div>
                    {form.steps.length > 1 && <button onClick={() => removeStep(idx)} disabled={submitting} className="text-red-500 disabled:opacity-50"><Trash2 size={12} /></button>}
                  </div>
                  <div className="flex gap-2">
                    <div className="w-28">
                      <label htmlFor={`delay-${idx}`} className="text-[10px] text-muted-foreground">Delay (hours)</label>
                      <input id={`delay-${idx}`} type="number" min={1} value={step.delay_hours} onChange={e => updateStep(idx, 'delay_hours', Number(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background" disabled={submitting} />
                    </div>
                    <div className="flex-1">
                      <label htmlFor={`subject-${idx}`} className="text-[10px] text-muted-foreground">Subject</label>
                      <input id={`subject-${idx}`} value={step.subject} onChange={e => updateStep(idx, 'subject', e.target.value)} placeholder="Follow-up subject (use {{name}}, {{company}})" className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background" disabled={submitting} />
                    </div>
                  </div>
                  <textarea value={step.body} onChange={e => updateStep(idx, 'body', e.target.value)} placeholder="Follow-up message body (use {{name}}, {{company}} for personalization)" rows={3} className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background resize-none" disabled={submitting} />
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
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />)}</div>
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
          <p className="font-medium">No follow-up sequences yet</p>
          <p className="text-sm mt-1">Create one to automate multi-step re-engagement campaigns.</p>
          <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 inline-flex items-center gap-1.5">
            <Plus size={14} /> Create First Sequence
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sequences.map(seq => {
            const steps = Array.isArray(seq.steps) ? seq.steps : (typeof seq.steps === 'string' ? safeJsonParse(seq.steps, []) : []);
            const statusClass = seq.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
            const isExpanded = expandedId === seq.id;
            const completionRate = seq.enrolled_count > 0 ? ((seq.completed_count / seq.enrolled_count) * 100).toFixed(1) : 0;
            const totalDelayHours = steps.reduce((sum, s) => sum + (s.delay_hours || 0), 0);
            const totalDelayDays = (totalDelayHours / 24).toFixed(1);

            return (
              <div key={seq.id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Header */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-foreground">{seq.name}</h3>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${statusClass}`}>{seq.status}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {TRIGGER_LABELS[seq.trigger_condition] || seq.trigger_condition}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setExpandedId(isExpanded ? null : seq.id)} className="p-1.5 rounded hover:bg-muted" title={isExpanded ? 'Collapse' : 'Expand details'}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button onClick={() => toggleStatus(seq)} disabled={togglingId === seq.id} className="p-1.5 rounded hover:bg-muted disabled:opacity-50">
                        {togglingId === seq.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : (seq.status === 'active' ? <Pause size={14} /> : <Play size={14} />)
                        }
                      </button>
                      <button onClick={() => handleDelete(seq.id)} disabled={deletingId === seq.id} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 disabled:opacity-50">
                        {deletingId === seq.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Step Timeline */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {steps.map((step, idx) => {
                      const ActionIcon = ACTION_ICONS[step.action] || Mail;
                      return (
                        <div key={`timeline-${idx}`} className="flex items-center gap-1">
                          <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
                            <ActionIcon size={10} />
                            <Clock size={10} /> {step.delay_hours}h → {ACTION_LABELS[step.action] || 'Email'}
                          </div>
                          {idx < steps.length - 1 && <ArrowRight size={12} className="text-muted-foreground" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Key Metrics Row */}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <BarChart3 size={12} />
                      <span>{steps.length} steps</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock size={12} />
                      <span>{totalDelayDays}d span</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users size={12} />
                      <span>{fmt(seq.enrolled_count)} enrolled</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <TrendingUp size={12} />
                      <span>{fmt(seq.completed_count)} completed</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Eye size={12} className="text-blue-500" />
                      <span className="font-medium">{seq.open_rate || 0}% opens</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <MessageSquare size={12} className="text-green-500" />
                      <span className="font-medium">{seq.reply_rate || 0}% replies</span>
                    </div>
                  </div>

                  {/* Completion Progress Bar */}
                  {seq.enrolled_count > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${completionRate}%` }} />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{completionRate}% complete</span>
                    </div>
                  )}
                </div>

                {/* Expanded Detail View */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 p-5 space-y-5">
                    {/* Conversion Funnel */}
                    {(() => {
                      const funnelSteps = steps.filter(s => s.sent > 0);
                      if (funnelSteps.length === 0) return null;
                      const maxSent = Math.max(...funnelSteps.map(s => s.sent || 0), 1);
                      return (
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5"><TrendingUp size={14} className="text-primary" /> Conversion Funnel</h4>
                          <div className="flex items-end gap-2 h-24">
                            {steps.map((step, idx) => {
                              const sent = step.sent || 0;
                              const opened = step.opened || 0;
                              const replied = step.replied || 0;
                              const barH = Math.max((sent / maxSent) * 100, 4);
                              const openH = sent > 0 ? Math.max((opened / maxSent) * 100, 2) : 0;
                              const replyH = sent > 0 ? Math.max((replied / maxSent) * 100, 2) : 0;
                              return (
                                <div key={`funnel-${idx}`} className="flex-1 flex flex-col items-center gap-0.5">
                                  <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: 80 }}>
                                    <div className="w-1/3 bg-blue-400/70 rounded-t" style={{ height: `${barH}%` }} title={`Sent: ${sent}`} />
                                    <div className="w-1/3 bg-amber-400/70 rounded-t" style={{ height: `${openH}%` }} title={`Opened: ${opened}`} />
                                    <div className="w-1/3 bg-green-500/70 rounded-t" style={{ height: `${replyH}%` }} title={`Replied: ${replied}`} />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground font-medium">Step {idx + 1}</span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400/70 inline-block" /> Sent</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400/70 inline-block" /> Opened</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500/70 inline-block" /> Replied</span>
                          </div>
                        </div>
                      );
                    })()}

                    <h4 className="text-sm font-semibold text-foreground">Sequence Steps Detail</h4>

                    <div className="space-y-3">
                      {steps.map((step, idx) => {
                        const ActionIcon = ACTION_ICONS[step.action] || Mail;
                        const cumulativeDelay = steps.slice(0, idx + 1).reduce((s, st) => s + (st.delay_hours || 0), 0);
                        const sent = step.sent || 0;
                        const opened = step.opened || 0;
                        const replied = step.replied || 0;
                        const openRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : 0;
                        const replyRate = sent > 0 ? ((replied / sent) * 100).toFixed(1) : 0;

                        return (
                          <div key={`detail-${idx}`} className="flex gap-4">
                            {/* Timeline Connector */}
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${seq.status === 'active' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <ActionIcon size={14} />
                              </div>
                              {idx < steps.length - 1 && (
                                <div className="w-0.5 flex-1 bg-border mt-1" />
                              )}
                            </div>

                            {/* Step Content */}
                            <div className="flex-1 pb-4">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-semibold text-foreground">Step {idx + 1}: {ACTION_LABELS[step.action] || 'Email'}</span>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                  <span className="bg-muted px-2 py-0.5 rounded-full">After {step.delay_hours}h</span>
                                  <span className="bg-muted px-2 py-0.5 rounded-full">Day {(cumulativeDelay / 24).toFixed(0)}</span>
                                </div>
                              </div>
                              {step.subject && (
                                <p className="text-xs font-medium text-foreground mb-1">Subject: {step.subject}</p>
                              )}
                              {step.body && (
                                <div className="bg-background border border-border rounded-lg p-2.5 text-xs text-muted-foreground whitespace-pre-wrap max-h-24 overflow-y-auto">
                                  {step.body}
                                </div>
                              )}

                              {/* Per-Step Analytics */}
                              {sent > 0 && (
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-2.5 py-1.5">
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Sent</p>
                                    <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{fmt(sent)}</p>
                                  </div>
                                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-1.5">
                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Opened</p>
                                    <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{fmt(opened)} <span className="text-[10px] font-normal">({openRate}%)</span></p>
                                  </div>
                                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-2.5 py-1.5">
                                    <p className="text-[10px] text-green-600 dark:text-green-400 font-medium">Replied</p>
                                    <p className="text-sm font-bold text-green-700 dark:text-green-300">{fmt(replied)} <span className="text-[10px] font-normal">({replyRate}%)</span></p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t border-border pt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Max Attempts</span>
                        <p className="font-semibold">{seq.max_attempts}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Trigger</span>
                        <p className="font-semibold">{TRIGGER_LABELS[seq.trigger_condition]}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Duration</span>
                        <p className="font-semibold">{totalDelayHours}h ({totalDelayDays} days)</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created</span>
                        <p className="font-semibold">{seq.created_at ? new Date(seq.created_at).toLocaleDateString() : '—'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
