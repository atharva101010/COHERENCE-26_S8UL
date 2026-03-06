import { useState, useRef, useEffect } from 'react';
import {
  Send, Bot, User, Sparkles, Loader2, Wand2, GitBranch,
  Copy, Check, RefreshCw, Trash2, ChevronRight
} from 'lucide-react';
import { chatWithAI, createWorkflowWithAI } from '../lib/supabaseService';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

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
  const [tab, setTab] = useState('chat'); // 'chat' | 'create-workflow'
  const [wfDescription, setWfDescription] = useState('');
  const [creatingWf, setCreatingWf] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

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
    </div>
  );
}
