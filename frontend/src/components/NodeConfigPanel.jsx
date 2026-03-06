import { useState, useEffect } from 'react';
import {
  X, Play, Sparkles, Mail, Clock, GitBranch, UserCheck, Square,
  Globe, Webhook, Bot, Code, Filter, Merge, Split, CalendarClock,
  FileText, Tags, MessageSquare, Smartphone, Key, Eye
} from 'lucide-react';
import { fetchCredentials } from '../lib/supabaseService';
import AIPreviewModal from './AIPreviewModal';

const nodeIcons = {
  startNode: { icon: Play, bgClass: 'bg-emerald-500', headerBg: 'from-emerald-50 to-emerald-100', label: 'Start Node' },
  aiGenerateNode: { icon: Sparkles, bgClass: 'bg-violet-500', headerBg: 'from-violet-50 to-violet-100', label: 'AI Generate' },
  emailNode: { icon: Mail, bgClass: 'bg-blue-500', headerBg: 'from-blue-50 to-blue-100', label: 'Email Node' },
  delayNode: { icon: Clock, bgClass: 'bg-amber-500', headerBg: 'from-amber-50 to-amber-100', label: 'Delay Node' },
  conditionNode: { icon: GitBranch, bgClass: 'bg-orange-500', headerBg: 'from-orange-50 to-orange-100', label: 'Condition Node' },
  updateLeadNode: { icon: UserCheck, bgClass: 'bg-teal-500', headerBg: 'from-teal-50 to-teal-100', label: 'Update Lead' },
  endNode: { icon: Square, bgClass: 'bg-red-500', headerBg: 'from-red-50 to-red-100', label: 'End Node' },
  httpRequestNode: { icon: Globe, bgClass: 'bg-sky-500', headerBg: 'from-sky-50 to-cyan-100', label: 'HTTP Request' },
  webhookNode: { icon: Webhook, bgClass: 'bg-pink-500', headerBg: 'from-pink-50 to-rose-100', label: 'Webhook' },
  aiAgentNode: { icon: Bot, bgClass: 'bg-purple-500', headerBg: 'from-purple-50 to-indigo-100', label: 'AI Agent' },
  codeNode: { icon: Code, bgClass: 'bg-zinc-700', headerBg: 'from-zinc-50 to-zinc-200', label: 'Code' },
  filterNode: { icon: Filter, bgClass: 'bg-indigo-500', headerBg: 'from-indigo-50 to-blue-100', label: 'Filter' },
  mergeNode: { icon: Merge, bgClass: 'bg-lime-500', headerBg: 'from-lime-50 to-green-100', label: 'Merge' },
  splitNode: { icon: Split, bgClass: 'bg-fuchsia-500', headerBg: 'from-fuchsia-50 to-pink-100', label: 'Split' },
  scheduleNode: { icon: CalendarClock, bgClass: 'bg-cyan-500', headerBg: 'from-cyan-50 to-sky-100', label: 'Schedule' },
  summarizerNode: { icon: FileText, bgClass: 'bg-rose-500', headerBg: 'from-rose-50 to-pink-100', label: 'Summarizer' },
  classifierNode: { icon: Tags, bgClass: 'bg-yellow-500', headerBg: 'from-yellow-50 to-amber-100', label: 'Classifier' },
  slackNode: { icon: MessageSquare, bgClass: 'bg-green-600', headerBg: 'from-green-50 to-emerald-100', label: 'Slack' },
  smsNode: { icon: Smartphone, bgClass: 'bg-violet-600', headerBg: 'from-violet-50 to-purple-100', label: 'SMS' },
};

const aiProviders = {
  groq: {
    label: 'Groq',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  },
  openai: {
    label: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-preview', 'o1-mini'],
  },
  anthropic: {
    label: 'Anthropic',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  },
  google: {
    label: 'Google AI',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
};

export default function NodeConfigPanel({ node, onClose, onUpdate }) {
  const [credentials, setCredentials] = useState([]);
  const [showAIPreview, setShowAIPreview] = useState(false);

  useEffect(() => {
    fetchCredentials().then(creds => setCredentials(creds || [])).catch(() => {});
  }, []);

  if (!node) return null;

  const config = nodeIcons[node.type] || { icon: Play, bgClass: 'bg-zinc-500', headerBg: 'from-zinc-50 to-zinc-100', label: 'Node' };
  const Icon = config.icon;

  const updateData = (key, value) => {
    onUpdate(node.id, { ...node.data, [key]: value });
  };

  const inputClass = "w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none";
  const labelClass = "block text-sm font-medium text-zinc-700 mb-1";

  const credsByType = (type) => credentials.filter(c => c.type === type);

  return (
    <div className="w-80 bg-white border-l border-zinc-200 h-full overflow-y-auto shadow-lg">
      {/* Header */}
      <div className={`p-4 bg-gradient-to-r ${config.headerBg} border-b border-zinc-200`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${config.bgClass} flex items-center justify-center`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">{config.label}</h3>
              <p className="text-xs text-zinc-500">ID: {node.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-200 rounded-lg transition-colors">
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        {/* Common: Label */}
        <div>
          <label className={labelClass}>Label</label>
          <input type="text" value={node.data.label || ''} onChange={(e) => updateData('label', e.target.value)} className={inputClass} />
        </div>

        {/* ===== START NODE ===== */}
        {node.type === 'startNode' && (
          <div>
            <label className={labelClass}>Trigger</label>
            <select value={node.data.trigger || 'manual'} onChange={(e) => updateData('trigger', e.target.value)} className={inputClass}>
              <option value="manual">Manual</option>
              <option value="scheduled">Scheduled</option>
              <option value="on_import">On Lead Import</option>
              <option value="webhook">Webhook</option>
            </select>
          </div>
        )}

        {/* ===== AI GENERATE NODE ===== */}
        {node.type === 'aiGenerateNode' && (
          <>
            {/* Message Type */}
            <div>
              <label className={labelClass}>Message Type</label>
              <select value={node.data.messageType || 'outreach_email'} onChange={(e) => updateData('messageType', e.target.value)} className={inputClass}>
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

            {/* Sender Info */}
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-3">
              <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Sender Details</h4>
              <div>
                <label className={labelClass}>Your Name</label>
                <input type="text" value={node.data.senderName || ''} onChange={(e) => updateData('senderName', e.target.value)} placeholder="e.g. Alex Johnson" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Your Company Name</label>
                <input type="text" value={node.data.companyName || ''} onChange={(e) => updateData('companyName', e.target.value)} placeholder="e.g. FlowReach AI" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Signature</label>
                <textarea value={node.data.signature || ''} onChange={(e) => updateData('signature', e.target.value)} rows={2}
                  placeholder="Best regards,&#10;Alex Johnson, CEO at FlowReach AI" className={inputClass + ' resize-none'} />
              </div>
            </div>

            {/* Personalization */}
            <div className="p-3 bg-violet-50/60 rounded-xl border border-violet-100 space-y-3">
              <h4 className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Personalization</h4>
              <div>
                <label className={labelClass}>Target Industry</label>
                <input type="text" value={node.data.industry || ''} onChange={(e) => updateData('industry', e.target.value)} placeholder="e.g. SaaS, Healthcare, FinTech" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Pain Points to Address</label>
                <textarea value={node.data.painPoints || ''} onChange={(e) => updateData('painPoints', e.target.value)} rows={2}
                  placeholder="e.g. Manual outreach is slow, low response rates, no personalization at scale" className={inputClass + ' resize-none'} />
              </div>
              <div>
                <label className={labelClass}>Call to Action</label>
                <input type="text" value={node.data.callToAction || ''} onChange={(e) => updateData('callToAction', e.target.value)} placeholder="e.g. Book a 15-min demo call" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Language</label>
                <select value={node.data.language || 'English'} onChange={(e) => updateData('language', e.target.value)} className={inputClass}>
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Portuguese">Portuguese</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Arabic">Arabic</option>
                </select>
              </div>
            </div>

            {/* Prompt Template */}
            <div>
              <label className={labelClass}>Prompt Template</label>
              <textarea value={node.data.prompt || ''} onChange={(e) => updateData('prompt', e.target.value)} rows={4}
                placeholder="Write a personalized email to {{name}} at {{company}}..." className={inputClass + ' resize-none'} />
              <p className="mt-1 text-xs text-zinc-400">Variables: {'{{name}}'}, {'{{email}}'}, {'{{company}}'}, {'{{title}}'}</p>
            </div>

            {/* Tone & Length */}
            <div>
              <label className={labelClass}>Tone</label>
              <select value={node.data.tone || 'professional'} onChange={(e) => updateData('tone', e.target.value)} className={inputClass}>
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
              <label className={labelClass}>Max Length (words)</label>
              <input type="number" value={node.data.maxLength || 200} onChange={(e) => updateData('maxLength', Number(e.target.value))} min={50} max={500} className={inputClass} />
            </div>
            <button
              onClick={() => setShowAIPreview(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 rounded-lg shadow-md shadow-violet-200 transition-all"
            >
              <Eye className="w-4 h-4" />
              Preview AI Messages
            </button>
          </>
        )}

        {/* ===== EMAIL NODE ===== */}
        {node.type === 'emailNode' && (
          <>
            <div>
              <label className={labelClass}>Subject Line</label>
              <input type="text" value={node.data.subject || ''} onChange={(e) => updateData('subject', e.target.value)} placeholder="Quick question about {{company}}" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>From Name</label>
              <input type="text" value={node.data.fromName || ''} onChange={(e) => updateData('fromName', e.target.value)} placeholder="FlowReach AI" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Credential</label>
              <select value={node.data.credentialId || ''} onChange={(e) => updateData('credentialId', e.target.value)} className={inputClass}>
                <option value="">None (log only)</option>
                {credsByType('smtp').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </>
        )}

        {/* ===== DELAY NODE ===== */}
        {node.type === 'delayNode' && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass}>Duration</label>
              <input type="number" value={node.data.duration || 1} onChange={(e) => updateData('duration', Number(e.target.value))} min={1} max={365} className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Unit</label>
              <select value={node.data.unit || 'days'} onChange={(e) => updateData('unit', e.target.value)} className={inputClass}>
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>
        )}

        {/* ===== CONDITION NODE ===== */}
        {node.type === 'conditionNode' && (
          <>
            <div>
              <label className={labelClass}>Field</label>
              <select value={node.data.field || 'status'} onChange={(e) => updateData('field', e.target.value)} className={inputClass}>
                <option value="status">Lead Status</option>
                <option value="email">Email</option>
                <option value="company">Company</option>
                <option value="title">Title</option>
                <option value="source">Source</option>
                <option value="name">Name</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Operator</label>
              <select value={node.data.operator || 'equals'} onChange={(e) => updateData('operator', e.target.value)} className={inputClass}>
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="contains">Contains</option>
                <option value="not_contains">Does Not Contain</option>
                <option value="starts_with">Starts With</option>
                <option value="ends_with">Ends With</option>
                <option value="is_empty">Is Empty</option>
                <option value="is_not_empty">Is Not Empty</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Value</label>
              {node.data.field === 'status' ? (
                <select value={node.data.value || ''} onChange={(e) => updateData('value', e.target.value)} className={inputClass}>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="replied">Replied</option>
                  <option value="converted">Converted</option>
                  <option value="bounced">Bounced</option>
                  <option value="unsubscribed">Unsubscribed</option>
                </select>
              ) : (
                <input type="text" value={node.data.value || ''} onChange={(e) => updateData('value', e.target.value)} placeholder="Enter value..." className={inputClass} />
              )}
            </div>
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs text-orange-700"><strong>Yes (left):</strong> Condition true<br /><strong>No (right):</strong> Condition false</p>
            </div>
          </>
        )}

        {/* ===== UPDATE LEAD NODE ===== */}
        {node.type === 'updateLeadNode' && (
          <div>
            <label className={labelClass}>Set Status To</label>
            <select value={node.data.status || 'contacted'} onChange={(e) => updateData('status', e.target.value)} className={inputClass}>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="replied">Replied</option>
              <option value="converted">Converted</option>
              <option value="bounced">Bounced</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
          </div>
        )}

        {/* ===== END NODE ===== */}
        {node.type === 'endNode' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">This is the terminal node. The workflow ends here.</p>
          </div>
        )}

        {/* ===== HTTP REQUEST NODE ===== */}
        {node.type === 'httpRequestNode' && (
          <>
            <div>
              <label className={labelClass}>Method</label>
              <select value={node.data.method || 'GET'} onChange={(e) => updateData('method', e.target.value)} className={inputClass}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>URL</label>
              <input type="text" value={node.data.url || ''} onChange={(e) => updateData('url', e.target.value)} placeholder="https://api.example.com/data" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Headers (JSON)</label>
              <textarea value={node.data.headers || '{}'} onChange={(e) => updateData('headers', e.target.value)} rows={3}
                placeholder='{"Authorization": "Bearer {{apiKey}}"}'
                className={inputClass + ' resize-none font-mono text-xs'} />
            </div>
            <div>
              <label className={labelClass}>Body (JSON)</label>
              <textarea value={node.data.body || ''} onChange={(e) => updateData('body', e.target.value)} rows={3}
                placeholder='{"key": "value"}'
                className={inputClass + ' resize-none font-mono text-xs'} />
            </div>
            <div>
              <label className={labelClass}>Credential</label>
              <select value={node.data.credentialId || ''} onChange={(e) => updateData('credentialId', e.target.value)} className={inputClass}>
                <option value="">No Auth</option>
                {credsByType('api_key').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                {credsByType('bearer_token').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </>
        )}

        {/* ===== WEBHOOK NODE ===== */}
        {node.type === 'webhookNode' && (
          <>
            <div>
              <label className={labelClass}>Webhook Path</label>
              <div className="flex items-center">
                <span className="text-xs text-zinc-400 mr-1">/webhook/</span>
                <input type="text" value={node.data.path || ''} onChange={(e) => updateData('path', e.target.value)} placeholder="my-hook" className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>HTTP Method</label>
              <select value={node.data.httpMethod || 'POST'} onChange={(e) => updateData('httpMethod', e.target.value)} className={inputClass}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Response Message</label>
              <input type="text" value={node.data.responseMessage || ''} onChange={(e) => updateData('responseMessage', e.target.value)} placeholder="Webhook received" className={inputClass} />
            </div>
          </>
        )}

        {/* ===== AI AGENT NODE ===== */}
        {node.type === 'aiAgentNode' && (
          <>
            <div>
              <label className={labelClass}>AI Provider</label>
              <select value={node.data.provider || 'groq'} onChange={(e) => {
                updateData('provider', e.target.value);
                const models = aiProviders[e.target.value]?.models || [];
                updateData('model', models[0] || '');
              }} className={inputClass}>
                {Object.entries(aiProviders).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Model</label>
              <select value={node.data.model || ''} onChange={(e) => updateData('model', e.target.value)} className={inputClass}>
                {(aiProviders[node.data.provider || 'groq']?.models || []).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Credential</label>
              <select value={node.data.credentialId || ''} onChange={(e) => updateData('credentialId', e.target.value)} className={inputClass}>
                <option value="">Select API Key...</option>
                {credsByType(node.data.provider || 'groq').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="mt-1 text-xs text-zinc-400 flex items-center gap-1">
                <Key className="w-3 h-3" /> Add keys in Settings → API Keys
              </p>
            </div>
            <div>
              <label className={labelClass}>System Prompt</label>
              <textarea value={node.data.systemPrompt || ''} onChange={(e) => updateData('systemPrompt', e.target.value)} rows={3}
                placeholder="You are a helpful assistant that..." className={inputClass + ' resize-none'} />
            </div>
            <div>
              <label className={labelClass}>User Prompt</label>
              <textarea value={node.data.userPrompt || ''} onChange={(e) => updateData('userPrompt', e.target.value)} rows={3}
                placeholder="Analyze this lead data: {{name}}, {{company}}" className={inputClass + ' resize-none'} />
              <p className="mt-1 text-xs text-zinc-400">Variables: {'{{name}}'}, {'{{email}}'}, {'{{company}}'}, {'{{title}}'}</p>
            </div>
            <div>
              <label className={labelClass}>Temperature</label>
              <input type="range" min={0} max={2} step={0.1} value={node.data.temperature ?? 0.7}
                onChange={(e) => updateData('temperature', Number(e.target.value))}
                className="w-full accent-purple-500" />
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Precise (0)</span>
                <span className="font-medium text-purple-600">{node.data.temperature ?? 0.7}</span>
                <span>Creative (2)</span>
              </div>
            </div>
            <div>
              <label className={labelClass}>Max Tokens</label>
              <input type="number" value={node.data.maxTokens || 1024} onChange={(e) => updateData('maxTokens', Number(e.target.value))} min={64} max={8192} className={inputClass} />
            </div>
          </>
        )}

        {/* ===== CODE NODE ===== */}
        {node.type === 'codeNode' && (
          <>
            <div>
              <label className={labelClass}>Language</label>
              <select value={node.data.language || 'javascript'} onChange={(e) => updateData('language', e.target.value)} className={inputClass}>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Code</label>
              <textarea value={node.data.code || ''} onChange={(e) => updateData('code', e.target.value)} rows={8}
                placeholder={node.data.language === 'python' ? '# Access data with input_data\nresult = {"output": input_data["name"]}' : '// Access data with inputData\nreturn { output: inputData.name };'}
                className={inputClass + ' resize-none font-mono text-xs'} />
              <p className="mt-1 text-xs text-zinc-400">Input data is available as {node.data.language === 'python' ? 'input_data' : 'inputData'}</p>
            </div>
          </>
        )}

        {/* ===== FILTER NODE ===== */}
        {node.type === 'filterNode' && (
          <>
            <div>
              <label className={labelClass}>Filter Field</label>
              <select value={node.data.filterField || 'status'} onChange={(e) => updateData('filterField', e.target.value)} className={inputClass}>
                <option value="status">Lead Status</option>
                <option value="email">Email</option>
                <option value="company">Company</option>
                <option value="title">Title</option>
                <option value="source">Source</option>
                <option value="name">Name</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Operator</label>
              <select value={node.data.filterOp || 'equals'} onChange={(e) => updateData('filterOp', e.target.value)} className={inputClass}>
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="contains">Contains</option>
                <option value="not_contains">Does Not Contain</option>
                <option value="is_empty">Is Empty</option>
                <option value="is_not_empty">Is Not Empty</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Value</label>
              <input type="text" value={node.data.filterValue || ''} onChange={(e) => updateData('filterValue', e.target.value)} placeholder="Filter value..." className={inputClass} />
            </div>
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-xs text-indigo-700"><strong>Match (left):</strong> Passes filter<br /><strong>No Match (right):</strong> Does not pass</p>
            </div>
          </>
        )}

        {/* ===== MERGE NODE ===== */}
        {node.type === 'mergeNode' && (
          <div>
            <label className={labelClass}>Merge Mode</label>
            <select value={node.data.mode || 'append'} onChange={(e) => updateData('mode', e.target.value)} className={inputClass}>
              <option value="append">Append (combine all)</option>
              <option value="keep_first">Keep First Input</option>
              <option value="keep_last">Keep Last Input</option>
              <option value="merge_by_key">Merge by Key</option>
            </select>
            {node.data.mode === 'merge_by_key' && (
              <div className="mt-3">
                <label className={labelClass}>Merge Key Field</label>
                <input type="text" value={node.data.mergeKey || ''} onChange={(e) => updateData('mergeKey', e.target.value)} placeholder="email" className={inputClass} />
              </div>
            )}
          </div>
        )}

        {/* ===== SPLIT NODE ===== */}
        {node.type === 'splitNode' && (
          <>
            <div>
              <label className={labelClass}>Split Mode</label>
              <select value={node.data.splitMode || 'round_robin'} onChange={(e) => updateData('splitMode', e.target.value)} className={inputClass}>
                <option value="round_robin">Round Robin</option>
                <option value="percentage">Percentage Split</option>
                <option value="by_field">By Field Value</option>
              </select>
            </div>
            {node.data.splitMode === 'percentage' && (
              <div>
                <label className={labelClass}>Output A Percentage</label>
                <input type="number" value={node.data.percentage || 50} onChange={(e) => updateData('percentage', Number(e.target.value))} min={1} max={99} className={inputClass} />
                <p className="mt-1 text-xs text-zinc-400">Output B gets {100 - (node.data.percentage || 50)}%</p>
              </div>
            )}
            {node.data.splitMode === 'by_field' && (
              <div>
                <label className={labelClass}>Split Field</label>
                <input type="text" value={node.data.splitField || ''} onChange={(e) => updateData('splitField', e.target.value)} placeholder="status" className={inputClass} />
              </div>
            )}
          </>
        )}

        {/* ===== SCHEDULE NODE ===== */}
        {node.type === 'scheduleNode' && (
          <>
            <div>
              <label className={labelClass}>Interval</label>
              <select value={node.data.interval || 'daily'} onChange={(e) => updateData('interval', e.target.value)} className={inputClass}>
                <option value="every_minute">Every Minute</option>
                <option value="every_5_minutes">Every 5 Minutes</option>
                <option value="every_15_minutes">Every 15 Minutes</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="cron">Custom Cron</option>
              </select>
            </div>
            {node.data.interval === 'cron' && (
              <div>
                <label className={labelClass}>Cron Expression</label>
                <input type="text" value={node.data.cron || ''} onChange={(e) => updateData('cron', e.target.value)} placeholder="0 9 * * 1-5" className={inputClass + ' font-mono'} />
                <p className="mt-1 text-xs text-zinc-400">Example: 0 9 * * 1-5 = Mon-Fri at 9am</p>
              </div>
            )}
            {node.data.interval === 'daily' && (
              <div>
                <label className={labelClass}>Time (HH:MM)</label>
                <input type="time" value={node.data.time || '09:00'} onChange={(e) => updateData('time', e.target.value)} className={inputClass} />
              </div>
            )}
          </>
        )}

        {/* ===== SUMMARIZER NODE ===== */}
        {node.type === 'summarizerNode' && (
          <>
            <div>
              <label className={labelClass}>Credential (AI Provider)</label>
              <select value={node.data.credentialId || ''} onChange={(e) => updateData('credentialId', e.target.value)} className={inputClass}>
                <option value="">Select API Key...</option>
                {Object.keys(aiProviders).flatMap(p => credsByType(p)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Summary Style</label>
              <select value={node.data.style || 'bullets'} onChange={(e) => updateData('style', e.target.value)} className={inputClass}>
                <option value="bullets">Bullet Points</option>
                <option value="paragraph">Paragraph</option>
                <option value="tldr">TL;DR (one line)</option>
                <option value="key_points">Key Points</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Max Output Length (words)</label>
              <input type="number" value={node.data.outputLength || 100} onChange={(e) => updateData('outputLength', Number(e.target.value))} min={10} max={500} className={inputClass} />
            </div>
          </>
        )}

        {/* ===== CLASSIFIER NODE ===== */}
        {node.type === 'classifierNode' && (
          <>
            <div>
              <label className={labelClass}>Credential (AI Provider)</label>
              <select value={node.data.credentialId || ''} onChange={(e) => updateData('credentialId', e.target.value)} className={inputClass}>
                <option value="">Select API Key...</option>
                {Object.keys(aiProviders).flatMap(p => credsByType(p)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Categories (comma-separated)</label>
              <input type="text" value={(node.data.categories || []).join(', ')} onChange={(e) => updateData('categories', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="hot_lead, warm_lead, cold_lead" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Classification Prompt</label>
              <textarea value={node.data.classifyPrompt || ''} onChange={(e) => updateData('classifyPrompt', e.target.value)} rows={3}
                placeholder="Classify this lead based on their title and company..." className={inputClass + ' resize-none'} />
            </div>
          </>
        )}

        {/* ===== SLACK NODE ===== */}
        {node.type === 'slackNode' && (
          <>
            <div>
              <label className={labelClass}>Credential</label>
              <select value={node.data.credentialId || ''} onChange={(e) => updateData('credentialId', e.target.value)} className={inputClass}>
                <option value="">Select Slack Token...</option>
                {credsByType('slack').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Channel</label>
              <input type="text" value={node.data.channel || ''} onChange={(e) => updateData('channel', e.target.value)} placeholder="general" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Message</label>
              <textarea value={node.data.message || ''} onChange={(e) => updateData('message', e.target.value)} rows={3}
                placeholder="New lead: {{name}} from {{company}}" className={inputClass + ' resize-none'} />
              <p className="mt-1 text-xs text-zinc-400">Variables: {'{{name}}'}, {'{{email}}'}, {'{{company}}'}, {'{{title}}'}</p>
            </div>
          </>
        )}

        {/* ===== SMS NODE ===== */}
        {node.type === 'smsNode' && (
          <>
            <div>
              <label className={labelClass}>Credential</label>
              <select value={node.data.credentialId || ''} onChange={(e) => updateData('credentialId', e.target.value)} className={inputClass}>
                <option value="">Select SMS Provider...</option>
                {credsByType('twilio').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>To Number</label>
              <input type="text" value={node.data.to || ''} onChange={(e) => updateData('to', e.target.value)} placeholder="+1234567890 or {{phone}}" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Message</label>
              <textarea value={node.data.smsMessage || ''} onChange={(e) => updateData('smsMessage', e.target.value)} rows={3}
                placeholder="Hi {{name}}, follow up on our conversation..." className={inputClass + ' resize-none'} />
            </div>
          </>
        )}
      </div>

      {/* AI Preview Modal */}
      <AIPreviewModal
        isOpen={showAIPreview}
        onClose={() => setShowAIPreview(false)}
        nodeData={node.data}
      />
    </div>
  );
}
