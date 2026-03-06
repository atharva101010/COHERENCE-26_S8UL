import { useState, useRef, useEffect } from 'react';
import {
  Send, Bot, User, Sparkles, Loader2, Wand2, GitBranch,
  Copy, Check, RefreshCw, Trash2, ChevronRight, Mail, Building2,
  Target, Pen, MessageSquare, Hash, Phone, Users, Zap,
  Search, Download, CheckSquare, Square
} from 'lucide-react';
import { chatWithAI, createWorkflowWithAI } from '../lib/supabaseService';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const QUICK_PROMPTS = [
  { label: 'Cold outreach email', prompt: 'Write a cold outreach email template for a SaaS product targeting CTOs' },
  { label: 'Follow-up sequence', prompt: 'Create a 3-email follow-up sequence for leads who haven\'t responded' },
  { label: 'Lead scoring strategy', prompt: 'What criteria should I use to score leads for an outreach campaign?' },
  { label: 'Subject line ideas', prompt: 'Give me 10 compelling email subject lines for B2B outreach' },
  { label: 'Re-engagement email', prompt: 'Write a re-engagement email for leads that went cold after 30 days' },
  { label: 'Personalization tips', prompt: 'How can I personalize outreach emails at scale using AI?' },
];

const WORKFLOW_PROMPTS = [
  { label: 'Simple email campaign', desc: 'AI generates email → send → wait → follow up' },
  { label: 'Lead scoring pipeline', desc: 'Score leads with AI → route hot vs cold' },
  { label: 'Multi-touch outreach', desc: '3-step email sequence with delays and conditions' },
  { label: 'Re-engagement flow', desc: 'Filter cold leads → AI win-back email → update status' },
];

function getLeadStatusBadge(status) {
  if (status === 'converted') return 'bg-emerald-100 text-emerald-600';
  if (status === 'contacted' || status === 'replied') return 'bg-blue-100 text-blue-600';
  return 'bg-zinc-100 text-zinc-500';
}

function getChannelStatusBadge(status) {
  if (status === 'sent') return 'bg-emerald-100 text-emerald-700';
  if (status === 'failed') return 'bg-red-100 text-red-700';
  return 'bg-zinc-100 text-zinc-500';
}

function getResultStatusClass(status) {
  if (status === 'sent') return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  if (status === 'logged') return 'bg-amber-50 border-amber-200 text-amber-700';
  if (status === 'skipped') return 'bg-zinc-50 border-zinc-200 text-zinc-500';
  return 'bg-red-50 border-red-200 text-red-700';
}

function getMessageBubbleClass(msg) {
  if (msg.role === 'user') return 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white';
  if (msg.error) return 'bg-red-50 text-red-700 border border-red-200';
  return 'bg-zinc-50 text-zinc-800 border border-zinc-200/60';
}

function ChatTab({ messages, loading, copiedIdx, input, setInput, messagesEndRef, sendMessage, handleKeyDown, copyMessage, setMessages }) {
  return (
    <div className="flex gap-6 h-[calc(100vh-280px)]">
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-zinc-200/60 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={`msg-${msg.role}-${idx}`} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`max-w-[75%] group ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${getMessageBubbleClass(msg)}`}>
                  {msg.content}
                </div>
                {msg.role === 'assistant' && !msg.error && (
                  <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copyMessage(idx, msg.content)}
                      className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copiedIdx === idx ? 'Copied' : 'Copy'}
                    </button>
                    {msg.source && (
                      <span className="text-[10px] text-zinc-300">via {msg.source}</span>
                    )}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="px-4 py-3 border-t border-zinc-200/60">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about outreach, emails, workflows..."
              rows={1}
              className="flex-1 px-4 py-2.5 text-sm border border-zinc-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none resize-none max-h-32"
              style={{ minHeight: '42px' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="p-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => { setMessages([messages[0]]); }}
              className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear chat
            </button>
          </div>
        </div>
      </div>
      <div className="w-72 flex-shrink-0 space-y-4">
        <div className="bg-white rounded-2xl border border-zinc-200/60 p-4">
          <h4 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            Quick Prompts
          </h4>
          <div className="space-y-2">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp.label}
                onClick={() => sendMessage(qp.prompt)}
                disabled={loading}
                className="w-full flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 text-left text-xs text-zinc-700 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-all disabled:opacity-50"
              >
                <ChevronRight className="w-3 h-3 flex-shrink-0 text-zinc-400" />
                {qp.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateWorkflowTab({ wfDescription, setWfDescription, creatingWf, handleCreateWorkflow }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-zinc-200/60 p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wand2 className="w-8 h-8 text-violet-600" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900">Create Workflow with AI</h3>
          <p className="text-sm text-zinc-500 mt-1">Describe what you want and AI will build the workflow for you</p>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="wf-description" className="block text-sm font-medium text-zinc-700 mb-2">Describe your workflow</label>
            <textarea
              id="wf-description"
              value={wfDescription}
              onChange={(e) => setWfDescription(e.target.value)}
              placeholder="e.g., Send a personalized cold email to leads, wait 3 days, check if they replied, if yes mark as converted, if no send a follow-up email..."
              rows={4}
              className="w-full px-4 py-3 text-sm border border-zinc-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none resize-none"
            />
          </div>
          <button
            onClick={handleCreateWorkflow}
            disabled={!wfDescription.trim() || creatingWf}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {creatingWf ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating workflow...</>
            ) : (
              <><Wand2 className="w-4 h-4" /> Generate Workflow</>
            )}
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-zinc-200/60 p-6">
        <h4 className="text-sm font-semibold text-zinc-800 mb-4 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-violet-500" />
          Try These Ideas
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {WORKFLOW_PROMPTS.map((wp) => (
            <button
              key={wp.label}
              onClick={() => setWfDescription(wp.label + ': ' + wp.desc)}
              className="flex flex-col items-start p-4 rounded-xl border border-zinc-200 hover:bg-violet-50 hover:border-violet-200 transition-all text-left"
            >
              <span className="text-sm font-medium text-zinc-800">{wp.label}</span>
              <span className="text-xs text-zinc-400 mt-1">{wp.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AIChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m FlowReach AI, your intelligent outreach assistant. I can help you:\n\n• **Generate personalized emails** for your leads\n• **Create workflow automations** using natural language\n• **Write follow-up sequences** and templates\n• **Analyze strategies** for your outreach campaigns\n\nHow can I help you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [tab, setTab] = useState('chat'); // 'chat' | 'create-workflow' | 'generate'
  const [wfDescription, setWfDescription] = useState('');
  const [creatingWf, setCreatingWf] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Message Generator State
  const [genForm, setGenForm] = useState({
    recipientName: '', recipientEmail: '', recipientCompany: '', recipientTitle: '',
    senderName: '', companyName: '', signature: '',
    industry: '', painPoints: '', callToAction: '',
    tone: 'professional', messageType: 'outreach_email', language: 'English',
    prompt: 'Write a personalized email to {{name}} at {{company}}.', maxLength: 200,
    recipientPhone: '', recipientWhatsApp: '', recipientTelegram: '', recipientDiscord: '', recipientSlack: '',
  });
  const [generatedMsg, setGeneratedMsg] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState(['email']);
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState(null);

  // Bulk Send State
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ completed: 0, total: 0, currentLead: '' });
  const [bulkResults, setBulkResults] = useState(null);
  const [leadCount, setLeadCount] = useState(0);
  const [loadingLeadCount, setLoadingLeadCount] = useState(false);

  // Lead Picker State
  const [allLeads, setAllLeads] = useState([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [selectAll, setSelectAll] = useState(true);

  const CHANNELS = [
    { id: 'email', label: 'Email', icon: Mail, color: 'blue', bg: 'bg-blue-500', ring: 'ring-blue-300', activeBg: 'bg-blue-50 border-blue-300 text-blue-700' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'emerald', bg: 'bg-emerald-500', ring: 'ring-emerald-300', activeBg: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
    { id: 'telegram', label: 'Telegram', icon: Send, color: 'sky', bg: 'bg-sky-500', ring: 'ring-sky-300', activeBg: 'bg-sky-50 border-sky-300 text-sky-700' },
    { id: 'discord', label: 'Discord', icon: Hash, color: 'indigo', bg: 'bg-indigo-500', ring: 'ring-indigo-300', activeBg: 'bg-indigo-50 border-indigo-300 text-indigo-700' },
    { id: 'slack', label: 'Slack', icon: MessageSquare, color: 'green', bg: 'bg-green-600', ring: 'ring-green-300', activeBg: 'bg-green-50 border-green-300 text-green-700' },
  ];

  const toggleChannel = (id) => {
    setSelectedChannels(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // Fetch leads when bulk mode is enabled
  useEffect(() => {
    if (bulkMode) {
      setLoadingLeadCount(true);
      fetch(`${API_BASE}/api/leads?limit=500`)
        .then(r => r.json())
        .then(data => {
          const leads = data.leads || [];
          setAllLeads(leads);
          setLeadCount(data.total || leads.length);
          setSelectedLeadIds(leads.map(l => l.id));
          setSelectAll(true);
        })
        .catch(() => { setLeadCount(0); setAllLeads([]); })
        .finally(() => setLoadingLeadCount(false));
    }
  }, [bulkMode]);

  const filteredPickerLeads = allLeads.filter(l => {
    if (!leadSearch.trim()) return true;
    const q = leadSearch.toLowerCase();
    return l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q);
  });

  const toggleLeadSelection = (id) => {
    setSelectAll(false);
    setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedLeadIds([]);
      setSelectAll(false);
    } else {
      setSelectedLeadIds(allLeads.map(l => l.id));
      setSelectAll(true);
    }
  };

  const exportBulkResults = () => {
    if (!bulkResults) return;
    const rows = [['Lead Name', 'Email', 'Company', ...selectedChannels.map(c => c.charAt(0).toUpperCase() + c.slice(1) + ' Status')]];
    for (const lr of bulkResults.results) {
      const channelStatuses = selectedChannels.map(ch => {
        const found = lr.channels.find(c => c.channel === ch);
        return found ? `${found.status}: ${found.detail || ''}` : 'N/A';
      });
      rows.push([lr.name || '', lr.email || '', lr.company || '', ...channelStatuses]);
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `bulk-send-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Results exported!');
  };

  const handleBulkSend = async () => {
    if (bulkSending || selectedChannels.length === 0) return;
    setBulkSending(true);
    setBulkResults(null);
    setBulkProgress({ completed: 0, total: leadCount, currentLead: 'Starting...' });

    try {
      const res = await fetch(`${API_BASE}/api/ai/bulk-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: selectAll ? null : selectedLeadIds,
          channels: selectedChannels,
          prompt: genForm.prompt,
          tone: genForm.tone,
          maxLength: genForm.maxLength,
          companyName: genForm.companyName,
          senderName: genForm.senderName,
          industry: genForm.industry,
          painPoints: genForm.painPoints,
          callToAction: genForm.callToAction,
          signature: genForm.signature,
          language: genForm.language,
          messageType: genForm.messageType,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Bulk send failed');
      const data = await res.json();
      setBulkResults(data);
      setBulkProgress({ completed: data.summary.totalLeads, total: data.summary.totalLeads, currentLead: 'Complete' });
      const { totalSent, totalFailed, totalSkipped } = data.summary;
      toast.success(`Bulk send complete! ${totalSent} sent, ${totalFailed} failed, ${totalSkipped} skipped`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBulkSending(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: { name: genForm.recipientName || 'there', email: genForm.recipientEmail, company: genForm.recipientCompany, title: genForm.recipientTitle },
          prompt: genForm.prompt,
          tone: genForm.tone,
          maxLength: genForm.maxLength,
          companyName: genForm.companyName,
          senderName: genForm.senderName,
          industry: genForm.industry,
          painPoints: genForm.painPoints,
          callToAction: genForm.callToAction,
          signature: genForm.signature,
          language: genForm.language,
          messageType: genForm.messageType,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      setGeneratedMsg(data);
      setSendResults(null);
      toast.success('Message generated!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text = null) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const result = await chatWithAI({ message: msg });
      setMessages(prev => [...prev, { role: 'assistant', content: result.reply, source: result.source }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}. Please try again.`, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSendViaChannels = async () => {
    if (!generatedMsg || selectedChannels.length === 0 || sending) return;
    setSending(true);
    setSendResults(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channels: selectedChannels,
          message: {
            subject: generatedMsg.subject,
            body: generatedMsg.body,
          },
          recipient: {
            email: genForm.recipientEmail,
            phone: genForm.recipientPhone || '',
            whatsapp: genForm.recipientWhatsApp || genForm.recipientPhone || '',
            telegram: genForm.recipientTelegram || '',
            chatId: genForm.recipientTelegram || '',
            discordWebhook: genForm.recipientDiscord || '',
            slackWebhook: genForm.recipientSlack || '',
            leadId: null,
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Send failed');
      const data = await res.json();
      setSendResults(data.results);
      const sentCount = data.results.filter(r => r.status === 'sent').length;
      const loggedCount = data.results.filter(r => r.status === 'logged').length;
      if (sentCount > 0) toast.success(`Sent via ${sentCount} channel(s)!`);
      else if (loggedCount > 0) toast.success(`Logged to ${loggedCount} channel(s) (configure API keys to send)`);
      else toast.error('No messages were sent');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const copyMessage = (idx, content) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleCreateWorkflow = async () => {
    if (!wfDescription.trim() || creatingWf) return;

    setCreatingWf(true);
    try {
      const result = await createWorkflowWithAI({ description: wfDescription.trim() });
      toast.success(`Workflow "${result.workflow.name}" created!`);
      navigate(`/workflows/${result.workflow.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create workflow');
    } finally {
      setCreatingWf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">AI Assistant</h2>
            <p className="text-sm text-zinc-500">Chat with AI or create workflows using natural language</p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-zinc-100/80 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('chat')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            tab === 'chat' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          AI Chat
        </button>
        <button
          onClick={() => setTab('create-workflow')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            tab === 'create-workflow' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          Create Workflow with AI
        </button>
        <button
          onClick={() => setTab('generate')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            tab === 'generate' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <Pen className="w-3.5 h-3.5" />
          Message Generator
        </button>
      </div>

      {/* AI Chat Tab */}
      {tab === 'chat' && (
        <ChatTab
          messages={messages} loading={loading} copiedIdx={copiedIdx}
          input={input} setInput={setInput} messagesEndRef={messagesEndRef}
          sendMessage={sendMessage} handleKeyDown={handleKeyDown}
          copyMessage={copyMessage} setMessages={setMessages}
        />
      )}

      {/* Create Workflow with AI Tab */}
      {tab === 'create-workflow' && (
        <CreateWorkflowTab
          wfDescription={wfDescription} setWfDescription={setWfDescription}
          creatingWf={creatingWf} handleCreateWorkflow={handleCreateWorkflow}
        />
      )}

      {/* Message Generator Tab */}
      {tab === 'generate' && (
        <div className="flex gap-5 h-[calc(100vh-260px)] min-h-[500px]">
          {/* Form */}
          <div className="flex-1 min-w-0 overflow-y-auto pr-1">
            <div className="bg-white rounded-2xl border border-zinc-200/60 p-5 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center">
                  <Pen className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-zinc-900">AI Message Generator</h3>
                  <p className="text-xs text-zinc-500">Fill in the details below to generate a personalized message</p>
                </div>
              </div>

              {/* Single / Bulk Mode Toggle */}
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-zinc-50 to-zinc-100/50 rounded-xl border border-zinc-200">
                <div className="flex gap-0.5 bg-white rounded-lg p-0.5 border border-zinc-200 shadow-sm">
                  <button
                    onClick={() => { setBulkMode(false); setBulkResults(null); }}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                      bulkMode ? 'text-zinc-500 hover:text-zinc-700' : 'bg-indigo-600 text-white shadow-sm'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" /> Single
                  </button>
                  <button
                    onClick={() => { setBulkMode(true); setSendResults(null); setGeneratedMsg(null); }}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                      bulkMode ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" /> Bulk Send
                  </button>
                </div>
                {bulkMode && (
                  <div className="flex items-center gap-1.5 text-xs text-orange-700 bg-orange-50 px-2.5 py-1.5 rounded-lg border border-orange-200">
                    <Zap className="w-3.5 h-3.5" />
                    {loadingLeadCount ? 'Loading...' : <><span className="font-bold">{selectedLeadIds.length}</span> of <span className="font-bold">{leadCount}</span> leads selected</>}
                  </div>
                )}
              </div>

              {/* Recipient Info (only in single mode) */}
              {!bulkMode && (
              <>
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-3">
                <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Recipient Details
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="gen-recipientName" className="block text-xs font-medium text-zinc-600 mb-1">Recipient Name</label>
                    <input id="gen-recipientName" type="text" value={genForm.recipientName} onChange={(e) => setGenForm(f => ({ ...f, recipientName: e.target.value }))}
                      placeholder="e.g. Ishita" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label htmlFor="gen-recipientEmail" className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
                    <input id="gen-recipientEmail" type="email" value={genForm.recipientEmail} onChange={(e) => setGenForm(f => ({ ...f, recipientEmail: e.target.value }))}
                      placeholder="e.g. ishita@company.com" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label htmlFor="gen-recipientCompany" className="block text-xs font-medium text-zinc-600 mb-1">Company</label>
                    <input id="gen-recipientCompany" type="text" value={genForm.recipientCompany} onChange={(e) => setGenForm(f => ({ ...f, recipientCompany: e.target.value }))}
                      placeholder="e.g. TechCorp" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label htmlFor="gen-recipientTitle" className="block text-xs font-medium text-zinc-600 mb-1">Title / Role</label>
                    <input id="gen-recipientTitle" type="text" value={genForm.recipientTitle} onChange={(e) => setGenForm(f => ({ ...f, recipientTitle: e.target.value }))}
                      placeholder="e.g. VP of Marketing" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                </div>
              </div>

              {/* Channel Addresses (shown for selected channels) */}
              {(selectedChannels.includes('whatsapp') || selectedChannels.includes('telegram') || selectedChannels.includes('discord') || selectedChannels.includes('slack')) && (
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-3">
                  <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Channel Addresses
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {(selectedChannels.includes('email') || selectedChannels.includes('whatsapp')) && (
                      <div>
                        <label htmlFor="gen-recipientPhone" className="block text-xs font-medium text-zinc-600 mb-1">Phone / WhatsApp</label>
                        <input id="gen-recipientPhone" type="text" value={genForm.recipientPhone} onChange={(e) => setGenForm(f => ({ ...f, recipientPhone: e.target.value }))}
                          placeholder="+1234567890" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                      </div>
                    )}
                    {selectedChannels.includes('telegram') && (
                      <div>
                        <label htmlFor="gen-recipientTelegram" className="block text-xs font-medium text-zinc-600 mb-1">Telegram Chat ID</label>
                        <input id="gen-recipientTelegram" type="text" value={genForm.recipientTelegram} onChange={(e) => setGenForm(f => ({ ...f, recipientTelegram: e.target.value }))}
                          placeholder="e.g. 123456789" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                      </div>
                    )}
                    {selectedChannels.includes('discord') && (
                      <div>
                        <label htmlFor="gen-recipientDiscord" className="block text-xs font-medium text-zinc-600 mb-1">Discord Webhook URL</label>
                        <input id="gen-recipientDiscord" type="text" value={genForm.recipientDiscord} onChange={(e) => setGenForm(f => ({ ...f, recipientDiscord: e.target.value }))}
                          placeholder="https://discord.com/api/webhooks/..." className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                      </div>
                    )}
                    {selectedChannels.includes('slack') && (
                      <div>
                        <label htmlFor="gen-recipientSlack" className="block text-xs font-medium text-zinc-600 mb-1">Slack Webhook URL</label>
                        <input id="gen-recipientSlack" type="text" value={genForm.recipientSlack} onChange={(e) => setGenForm(f => ({ ...f, recipientSlack: e.target.value }))}
                          placeholder="https://hooks.slack.com/services/..." className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                      </div>
                    )}
                  </div>
                </div>
              )}
              </>
              )}

              {/* Lead Picker (bulk mode) */}
              {bulkMode && (
                <div className="p-4 bg-orange-50/60 rounded-xl border border-orange-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-orange-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Select Recipients
                    </h4>
                    <button onClick={toggleSelectAll} className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-800 transition-colors">
                      {selectAll ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      {selectAll ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text" value={leadSearch} onChange={e => setLeadSearch(e.target.value)}
                      placeholder="Search leads by name, email, or company..."
                      className="w-full pl-8 pr-3 py-2 border border-orange-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                    />
                    {leadSearch && <button onClick={() => setLeadSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"><Trash2 className="w-3 h-3" /></button>}
                  </div>

                  {/* Lead List */}
                  <div className="max-h-48 overflow-y-auto space-y-1 border border-orange-100 rounded-lg bg-white p-1">
                    {loadingLeadCount && (
                      <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-orange-400" /></div>
                    )}
                    {!loadingLeadCount && filteredPickerLeads.length === 0 && (
                      <div className="text-xs text-zinc-400 text-center py-4">No leads found</div>
                    )}
                    {!loadingLeadCount && filteredPickerLeads.length > 0 &&
                      filteredPickerLeads.map(lead => {
                        const isSelected = selectedLeadIds.includes(lead.id);
                        return (
                          <button
                            key={lead.id}
                            type="button"
                            onClick={() => toggleLeadSelection(lead.id)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-all text-xs ${
                              isSelected ? 'bg-orange-100 border border-orange-300' : 'hover:bg-zinc-50 border border-transparent'
                            }`}
                          >
                            {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" /> : <Square className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-zinc-800 truncate block">{lead.name}</span>
                              <span className="text-[10px] text-zinc-400 truncate block">{lead.email}{lead.company ? ` · ${lead.company}` : ''}</span>
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${getLeadStatusBadge(lead.status)}`}>{lead.status}</span>
                          </button>
                        );
                      })
                    }
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-orange-600">
                    <span>{selectedLeadIds.length} of {allLeads.length} leads selected</span>
                    {leadSearch && <span>{filteredPickerLeads.length} matching search</span>}
                  </div>
                </div>
              )}

              {/* Sender Info */}
              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-3">
                <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Sender Details
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="gen-senderName" className="block text-xs font-medium text-zinc-600 mb-1">Your Name</label>
                    <input id="gen-senderName" type="text" value={genForm.senderName} onChange={(e) => setGenForm(f => ({ ...f, senderName: e.target.value }))}
                      placeholder="e.g. Alex Johnson" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label htmlFor="gen-companyName" className="block text-xs font-medium text-zinc-600 mb-1">Your Company</label>
                    <input id="gen-companyName" type="text" value={genForm.companyName} onChange={(e) => setGenForm(f => ({ ...f, companyName: e.target.value }))}
                      placeholder="e.g. FlowReach AI" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label htmlFor="gen-signature" className="block text-xs font-medium text-zinc-600 mb-1">Signature</label>
                  <textarea id="gen-signature" value={genForm.signature} onChange={(e) => setGenForm(f => ({ ...f, signature: e.target.value }))} rows={2}
                    placeholder="Best regards,&#10;Alex Johnson, CEO at FlowReach AI" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none" />
                </div>
              </div>

              {/* Personalization */}
              <div className="p-4 bg-violet-50/60 rounded-xl border border-violet-100 space-y-3">
                <h4 className="text-xs font-semibold text-violet-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> Personalization
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="gen-messageType" className="block text-xs font-medium text-zinc-600 mb-1">Message Type</label>
                    <select id="gen-messageType" value={genForm.messageType} onChange={(e) => setGenForm(f => ({ ...f, messageType: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                      <option value="outreach_email">Outreach Email</option>
                      <option value="follow_up">Follow-up Email</option>
                      <option value="welcome_email">Welcome Email</option>
                      <option value="re_engagement">Re-engagement Email</option>
                      <option value="newsletter">Newsletter</option>
                      <option value="meeting_request">Meeting Request</option>
                      <option value="thank_you">Thank You Email</option>
                      <option value="introduction">Introduction Email</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="gen-tone" className="block text-xs font-medium text-zinc-600 mb-1">Tone</label>
                    <select id="gen-tone" value={genForm.tone} onChange={(e) => setGenForm(f => ({ ...f, tone: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly & Warm</option>
                      <option value="casual">Casual</option>
                      <option value="formal">Formal</option>
                      <option value="persuasive">Persuasive</option>
                      <option value="enthusiastic">Enthusiastic</option>
                      <option value="empathetic">Empathetic</option>
                      <option value="humorous">Humorous</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="gen-industry" className="block text-xs font-medium text-zinc-600 mb-1">Target Industry</label>
                    <input id="gen-industry" type="text" value={genForm.industry} onChange={(e) => setGenForm(f => ({ ...f, industry: e.target.value }))}
                      placeholder="e.g. SaaS, Healthcare, FinTech" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label htmlFor="gen-language" className="block text-xs font-medium text-zinc-600 mb-1">Language</label>
                    <select id="gen-language" value={genForm.language} onChange={(e) => setGenForm(f => ({ ...f, language: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Portuguese">Portuguese</option>
                      <option value="Japanese">Japanese</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="gen-painPoints" className="block text-xs font-medium text-zinc-600 mb-1">Pain Points to Address</label>
                  <textarea id="gen-painPoints" value={genForm.painPoints} onChange={(e) => setGenForm(f => ({ ...f, painPoints: e.target.value }))} rows={2}
                    placeholder="e.g. Manual outreach is slow, low response rates, no personalization at scale" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none" />
                </div>
                <div>
                  <label htmlFor="gen-cta" className="block text-xs font-medium text-zinc-600 mb-1">Call to Action</label>
                  <input id="gen-cta" type="text" value={genForm.callToAction} onChange={(e) => setGenForm(f => ({ ...f, callToAction: e.target.value }))}
                    placeholder="e.g. Book a 15-min demo call" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>
              </div>

              {/* Prompt */}
              <div>
                <label htmlFor="gen-prompt" className="block text-xs font-medium text-zinc-600 mb-1">Prompt Template</label>
                <textarea id="gen-prompt" value={genForm.prompt} onChange={(e) => setGenForm(f => ({ ...f, prompt: e.target.value }))} rows={3}
                  placeholder="Write a personalized email to {{name}} at {{company}}..." className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none" />
                <p className="mt-1 text-xs text-zinc-400">Variables: {'{{name}}'}, {'{{email}}'}, {'{{company}}'}, {'{{title}}'}</p>
              </div>

              <div>
                <label htmlFor="gen-maxLength" className="block text-xs font-medium text-zinc-600 mb-1">Max Length (words)</label>
                <input id="gen-maxLength" type="number" value={genForm.maxLength} onChange={(e) => setGenForm(f => ({ ...f, maxLength: Number(e.target.value) }))}
                  min={50} max={500} className="w-32 px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
              </div>

              {/* Channel Selector */}
              <div className="p-4 bg-gradient-to-r from-zinc-50 to-zinc-100/50 rounded-xl border border-zinc-200 space-y-3">
                <h4 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Send Via (select channels)</h4>
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map(ch => {
                    const active = selectedChannels.includes(ch.id);
                    const ChIcon = ch.icon;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => toggleChannel(ch.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-200 ${
                          active
                            ? `${ch.activeBg} border-current shadow-sm`
                            : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
                        }`}
                      >
                        <ChIcon className="w-3.5 h-3.5" />
                        {ch.label}
                        {active && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-zinc-400">
                  {selectedChannels.length === 0 ? 'Select at least 1 channel' : `${selectedChannels.length} channel(s) selected`}
                </p>
              </div>

              {/* Action Buttons */}
              {!bulkMode && (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200"
                >
                  {generating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating message...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Generate Personalized Message</>
                  )}
                </button>
              )}
              {bulkMode && (
                <div className="space-y-3">
                  <button
                    onClick={handleBulkSend}
                    disabled={bulkSending || selectedChannels.length === 0 || selectedLeadIds.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-200"
                  >
                    {bulkSending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending to {bulkProgress.completed}/{bulkProgress.total} leads...</>
                    ) : (() => {
                      const count = selectAll ? allLeads.length : selectedLeadIds.length;
                      return <><Users className="w-4 h-4" /> Generate &amp; Send to {selectAll ? `All ${allLeads.length}` : selectedLeadIds.length} Lead{count === 1 ? '' : 's'}</>;
                    })()}
                  </button>

                  {/* Bulk Progress Bar */}
                  {bulkSending && (
                    <div className="space-y-2">
                      <div className="w-full bg-zinc-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-red-500 h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${bulkProgress.total ? (bulkProgress.completed / bulkProgress.total) * 100 : 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-zinc-500 text-center">
                        Processing: {bulkProgress.currentLead} ({bulkProgress.completed}/{bulkProgress.total})
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Generated Output / Bulk Results */}
          <div className="w-[380px] flex-shrink-0">
            <div className="bg-white rounded-2xl border border-zinc-200/60 h-full flex flex-col">
              <div className={`p-4 border-b border-zinc-200 rounded-t-2xl ${
                bulkMode ? 'bg-gradient-to-r from-orange-50 to-amber-50' : 'bg-gradient-to-r from-indigo-50 to-violet-50'
              }`}>
                <h4 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                  {bulkMode ? (
                    <><Users className="w-4 h-4 text-orange-500" /> Bulk Send Results</>
                  ) : (
                    <><Mail className="w-4 h-4 text-indigo-500" /> Generated Message</>
                  )}
                </h4>
              </div>

              <div className="flex-1 overflow-y-auto p-5">

                {/* === BULK MODE PANEL === */}
                {bulkMode && (
                  <>
                    {!bulkSending && !bulkResults && (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                        <Users className="w-10 h-10 mb-3 text-zinc-300" />
                        <p className="text-sm font-medium">Ready to send in bulk</p>
                        <p className="text-xs mt-1 text-center">Configure your message settings, select channels, and click "Generate & Send to All Leads"</p>
                      </div>
                    )}

                    {bulkSending && (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                        <Loader2 className="w-10 h-10 animate-spin mb-3 text-orange-500" />
                        <p className="text-sm font-medium text-zinc-700">Sending to all leads...</p>
                        <p className="text-xs mt-1">{bulkProgress.currentLead}</p>
                        <div className="w-full mt-4 bg-zinc-200 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-orange-500 to-red-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${bulkProgress.total ? (bulkProgress.completed / bulkProgress.total) * 100 : 5}%` }}
                          />
                        </div>
                        <p className="text-xs mt-2 text-zinc-500">{bulkProgress.completed} of {bulkProgress.total} leads</p>
                      </div>
                    )}

                    {!bulkSending && bulkResults && (
                      <div className="space-y-4">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                            <p className="text-xl font-bold text-emerald-700">{bulkResults.summary.totalSent}</p>
                            <p className="text-[10px] text-emerald-600 font-medium">Sent</p>
                          </div>
                          <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-center">
                            <p className="text-xl font-bold text-red-700">{bulkResults.summary.totalFailed}</p>
                            <p className="text-[10px] text-red-600 font-medium">Failed</p>
                          </div>
                          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-center">
                            <p className="text-xl font-bold text-zinc-700">{bulkResults.summary.totalSkipped}</p>
                            <p className="text-[10px] text-zinc-600 font-medium">Skipped</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <Users className="w-3.5 h-3.5" />
                          <span>{bulkResults.summary.totalLeads} leads processed via {selectedChannels.length} channel(s)</span>
                        </div>

                        {/* Per-Lead Results */}
                        <div className="border-t border-zinc-200 pt-3 space-y-2 max-h-[400px] overflow-y-auto">
                          <h5 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide sticky top-0 bg-white pb-1">Per-Lead Results</h5>
                          {bulkResults.results.map((lr, i) => (
                            <div key={`bulk-${lr.leadId || i}`} className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-zinc-800">{lr.name || 'Unknown'}</span>
                                <span className="text-[10px] text-zinc-400">{lr.email}</span>
                              </div>
                              {lr.company && <span className="text-[10px] text-zinc-400">{lr.company}</span>}
                              <div className="flex flex-wrap gap-1">
                                {lr.channels.map((ch) => (
                                  <span
                                    key={`ch-${ch.channel}`}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium rounded ${getChannelStatusBadge(ch.status)}`}
                                  >
                                    {ch.status === 'sent' && <Check className="w-2 h-2" />}
                                    {ch.channel}: {ch.status}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Export & Send Again */}
                        <div className="flex gap-2">
                          <button
                            onClick={exportBulkResults}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" /> Export CSV
                          </button>
                          <button
                            onClick={() => { setBulkResults(null); }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Send Again
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* === SINGLE MODE PANEL === */}
                {!bulkMode && (
                  <>
                    {generating && (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-3 text-violet-500" />
                        <p className="text-sm">AI is crafting your message...</p>
                      </div>
                    )}

                    {!generating && !generatedMsg && (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                        <Sparkles className="w-10 h-10 mb-3 text-zinc-300" />
                        <p className="text-sm font-medium">No message generated yet</p>
                        <p className="text-xs mt-1">Fill in the form and click Generate</p>
                      </div>
                    )}

                    {!generating && generatedMsg && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${
                            generatedMsg.source === 'groq' ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {generatedMsg.source === 'groq' ? `Groq AI • ${generatedMsg.model || 'llama-3.3-70b'}` : 'Mock Data'}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`Subject: ${generatedMsg.subject}\n\n${generatedMsg.body}`);
                              toast.success('Copied to clipboard!');
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>

                        <div className="p-4 bg-gradient-to-br from-zinc-50 to-zinc-100/50 rounded-xl border border-zinc-200">
                          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-zinc-200">
                            <Mail className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-semibold text-zinc-800">{generatedMsg.subject}</span>
                          </div>
                          <div className="text-sm text-zinc-700 whitespace-pre-line leading-relaxed">
                            {generatedMsg.body}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span>Tone: {generatedMsg.tone}</span>
                          <span>•</span>
                          <span>To: {generatedMsg.lead?.name || 'N/A'}</span>
                          {generatedMsg.lead?.company && (
                            <><span>•</span><span>{generatedMsg.lead.company}</span></>
                          )}
                        </div>

                        <button
                          onClick={handleGenerate}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                        </button>

                        {/* Send via Channels */}
                        <div className="border-t border-zinc-200 pt-4 space-y-3">
                          <h5 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Send via selected channels</h5>
                          <div className="flex flex-wrap gap-1.5">
                            {CHANNELS.map(ch => {
                              const active = selectedChannels.includes(ch.id);
                              const ChIcon = ch.icon;
                              return (
                                <button
                                  key={ch.id}
                                  type="button"
                                  onClick={() => toggleChannel(ch.id)}
                                  className={`flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium rounded-md border transition-all ${
                                    active
                                      ? `${ch.activeBg} border-current`
                                      : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-600'
                                  }`}
                                >
                                  <ChIcon className="w-3 h-3" />
                                  {ch.label}
                                  {active && <Check className="w-2.5 h-2.5" />}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            onClick={handleSendViaChannels}
                            disabled={sending || selectedChannels.length === 0}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-lg shadow-md shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            {sending ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                            ) : (
                              <><Send className="w-4 h-4" /> Send via {selectedChannels.length} Channel{selectedChannels.length === 1 ? '' : 's'}</>
                            )}
                          </button>

                          {/* Send Results */}
                          {sendResults && (
                            <div className="space-y-1.5">
                              {sendResults.map((r, i) => (
                                <div key={`result-${r.channel}-${i}`} className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg border ${getResultStatusClass(r.status)}`}>
                                  {r.status === 'sent' && <Check className="w-3 h-3" />}
                                  {r.status === 'logged' && <Mail className="w-3 h-3" />}
                                  {r.status === 'failed' && <Trash2 className="w-3 h-3" />}
                                  <span className="font-medium capitalize">{r.channel}</span>
                                  <span className="text-[10px] opacity-70">— {r.detail || r.status}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
