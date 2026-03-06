import { useState, useRef, useEffect } from 'react';
import {
  Send, Bot, User, Sparkles, Loader2, Wand2, GitBranch,
  Copy, Check, RefreshCw, Trash2, ChevronRight, Mail, Building2,
  UserCircle, Target, Globe, Pen
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
  });
  const [generatedMsg, setGeneratedMsg] = useState(null);
  const [generating, setGenerating] = useState(false);

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
        <div className="flex gap-6 h-[calc(100vh-280px)]">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-zinc-200/60 overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[75%] group ${msg.role === 'user' ? 'order-first' : ''}`}>
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white'
                        : msg.error
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-zinc-50 text-zinc-800 border border-zinc-200/60'
                    }`}>
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

            {/* Input */}
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

          {/* Quick Prompts Sidebar */}
          <div className="w-72 flex-shrink-0 space-y-4">
            <div className="bg-white rounded-2xl border border-zinc-200/60 p-4">
              <h4 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                Quick Prompts
              </h4>
              <div className="space-y-2">
                {QUICK_PROMPTS.map((qp, i) => (
                  <button
                    key={i}
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
      )}

      {/* Create Workflow with AI Tab */}
      {tab === 'create-workflow' && (
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
                <label className="block text-sm font-medium text-zinc-700 mb-2">Describe your workflow</label>
                <textarea
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

          {/* Template Ideas */}
          <div className="bg-white rounded-2xl border border-zinc-200/60 p-6">
            <h4 className="text-sm font-semibold text-zinc-800 mb-4 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-violet-500" />
              Try These Ideas
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {WORKFLOW_PROMPTS.map((wp, i) => (
                <button
                  key={i}
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
      )}

      {/* Message Generator Tab */}
      {tab === 'generate' && (
        <div className="flex gap-6 h-[calc(100vh-280px)]">
          {/* Form */}
          <div className="flex-1 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-zinc-200/60 p-6 space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center">
                  <Pen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">AI Message Generator</h3>
                  <p className="text-xs text-zinc-500">Fill in the details below to generate a personalized message</p>
                </div>
              </div>

              {/* Recipient Info */}
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-3">
                <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Recipient Details
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Recipient Name</label>
                    <input type="text" value={genForm.recipientName} onChange={(e) => setGenForm(f => ({ ...f, recipientName: e.target.value }))}
                      placeholder="e.g. Ishita" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
                    <input type="email" value={genForm.recipientEmail} onChange={(e) => setGenForm(f => ({ ...f, recipientEmail: e.target.value }))}
                      placeholder="e.g. ishita@company.com" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Company</label>
                    <input type="text" value={genForm.recipientCompany} onChange={(e) => setGenForm(f => ({ ...f, recipientCompany: e.target.value }))}
                      placeholder="e.g. TechCorp" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Title / Role</label>
                    <input type="text" value={genForm.recipientTitle} onChange={(e) => setGenForm(f => ({ ...f, recipientTitle: e.target.value }))}
                      placeholder="e.g. VP of Marketing" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                </div>
              </div>

              {/* Sender Info */}
              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-3">
                <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Sender Details
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Your Name</label>
                    <input type="text" value={genForm.senderName} onChange={(e) => setGenForm(f => ({ ...f, senderName: e.target.value }))}
                      placeholder="e.g. Alex Johnson" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Your Company</label>
                    <input type="text" value={genForm.companyName} onChange={(e) => setGenForm(f => ({ ...f, companyName: e.target.value }))}
                      placeholder="e.g. FlowReach AI" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Signature</label>
                  <textarea value={genForm.signature} onChange={(e) => setGenForm(f => ({ ...f, signature: e.target.value }))} rows={2}
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
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Message Type</label>
                    <select value={genForm.messageType} onChange={(e) => setGenForm(f => ({ ...f, messageType: e.target.value }))}
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
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Tone</label>
                    <select value={genForm.tone} onChange={(e) => setGenForm(f => ({ ...f, tone: e.target.value }))}
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
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Target Industry</label>
                    <input type="text" value={genForm.industry} onChange={(e) => setGenForm(f => ({ ...f, industry: e.target.value }))}
                      placeholder="e.g. SaaS, Healthcare, FinTech" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Language</label>
                    <select value={genForm.language} onChange={(e) => setGenForm(f => ({ ...f, language: e.target.value }))}
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
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Pain Points to Address</label>
                  <textarea value={genForm.painPoints} onChange={(e) => setGenForm(f => ({ ...f, painPoints: e.target.value }))} rows={2}
                    placeholder="e.g. Manual outreach is slow, low response rates, no personalization at scale" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Call to Action</label>
                  <input type="text" value={genForm.callToAction} onChange={(e) => setGenForm(f => ({ ...f, callToAction: e.target.value }))}
                    placeholder="e.g. Book a 15-min demo call" className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Prompt Template</label>
                <textarea value={genForm.prompt} onChange={(e) => setGenForm(f => ({ ...f, prompt: e.target.value }))} rows={3}
                  placeholder="Write a personalized email to {{name}} at {{company}}..." className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none" />
                <p className="mt-1 text-xs text-zinc-400">Variables: {'{{name}}'}, {'{{email}}'}, {'{{company}}'}, {'{{title}}'}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Max Length (words)</label>
                <input type="number" value={genForm.maxLength} onChange={(e) => setGenForm(f => ({ ...f, maxLength: Number(e.target.value) }))}
                  min={50} max={500} className="w-32 px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
              </div>

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
            </div>
          </div>

          {/* Generated Output */}
          <div className="w-[420px] flex-shrink-0">
            <div className="bg-white rounded-2xl border border-zinc-200/60 h-full flex flex-col">
              <div className="p-4 border-b border-zinc-200 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-t-2xl">
                <h4 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-500" />
                  Generated Message
                </h4>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
