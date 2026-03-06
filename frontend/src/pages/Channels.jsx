import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Radio, Plus, Trash2, RefreshCw, Loader2, Search,
  MessageSquare, Send, Hash, CheckCircle2, XCircle,
  Settings, Download, Inbox, Link2, X
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const CHANNEL_CONFIG = {
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'bg-emerald-500', lightBg: 'bg-emerald-50', text: 'text-emerald-600' },
  telegram: { label: 'Telegram', icon: Send, color: 'bg-sky-500', lightBg: 'bg-sky-50', text: 'text-sky-600' },
  discord:  { label: 'Discord', icon: Hash, color: 'bg-indigo-500', lightBg: 'bg-indigo-50', text: 'text-indigo-600' },
  slack:    { label: 'Slack', icon: MessageSquare, color: 'bg-green-600', lightBg: 'bg-green-50', text: 'text-green-600' },
};

const CHANNEL_FIELDS = {
  whatsapp: [
    { key: 'phone_number_id', label: 'Phone Number ID' },
    { key: 'access_token', label: 'Access Token', secret: true },
    { key: 'verify_token', label: 'Verify Token' },
  ],
  telegram: [
    { key: 'bot_token', label: 'Bot Token', secret: true },
    { key: 'bot_username', label: 'Bot Username' },
  ],
  discord: [
    { key: 'webhook_url', label: 'Webhook URL' },
    { key: 'bot_token', label: 'Bot Token (optional)', secret: true },
  ],
  slack: [
    { key: 'bot_token', label: 'Bot Token', secret: true },
    { key: 'signing_secret', label: 'Signing Secret', secret: true },
  ],
};

export default function Channels() {
  const [tab, setTab] = useState('accounts');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addChannel, setAddChannel] = useState('whatsapp');
  const [addName, setAddName] = useState('');
  const [addConfig, setAddConfig] = useState({});

  // Inbox state
  const [inboxMessages, setInboxMessages] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [inboxChannel, setInboxChannel] = useState('');
  const [inboxSearch, setInboxSearch] = useState('');
  const [inboxPage, setInboxPage] = useState(1);
  const [inboxTotalPages, setInboxTotalPages] = useState(1);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/channels/accounts`);
      if (!res.ok) throw new Error('Failed to load accounts');
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadInbox = async () => {
    setInboxLoading(true);
    try {
      const params = new URLSearchParams();
      if (inboxChannel) params.set('channel', inboxChannel);
      params.set('page', String(inboxPage));
      params.set('limit', '30');
      const res = await fetch(`${API_BASE}/api/channels/inbox?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load inbox');
      const data = await res.json();
      setInboxMessages(data.messages || []);
      setInboxTotalPages(data.totalPages || 1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setInboxLoading(false);
    }
  };

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => { if (tab === 'inbox') loadInbox(); }, [tab, inboxChannel, inboxPage]);

  const handleAddAccount = async () => {
    if (!addName.trim()) { toast.error('Account name is required'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/channels/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: addChannel, account_name: addName.trim(), config: addConfig }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add account');
      }
      toast.success(`${CHANNEL_CONFIG[addChannel]?.label} account connected`);
      setShowAddModal(false);
      setAddName('');
      setAddConfig({});
      loadAccounts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteAccount = async (id, name) => {
    try {
      const res = await fetch(`${API_BASE}/api/channels/accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success(`Disconnected ${name}`);
      loadAccounts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      const res = await fetch(`${API_BASE}/api/channels/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!res.ok) throw new Error('Failed to update');
      loadAccounts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleExportInbox = () => {
    const filtered = inboxMessages.filter(m =>
      !inboxSearch ||
      (m.sender_name || '').toLowerCase().includes(inboxSearch.toLowerCase()) ||
      (m.body || '').toLowerCase().includes(inboxSearch.toLowerCase())
    );
    const csv = [
      ['ID', 'Channel', 'Sender', 'Body', 'Date'].join(','),
      ...filtered.map(m => [
        m.id,
        m.channel,
        `"${(m.sender_name || '').replaceAll('"', '""')}"`,
        `"${(m.body || '').replaceAll('"', '""').substring(0, 500)}"`,  
        m.created_at,
      ].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowreach-inbox-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Inbox exported');
  };

  const filteredInbox = inboxMessages.filter(m =>
    !inboxSearch ||
    (m.sender_name || '').toLowerCase().includes(inboxSearch.toLowerCase()) ||
    (m.body || '').toLowerCase().includes(inboxSearch.toLowerCase())
  );

  const tabs = [
    { id: 'accounts', label: 'Connected Accounts', icon: Link2 },
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'export', label: 'Export', icon: Download },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="w-6 h-6 text-indigo-600" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">Channels</h2>
            <p className="text-sm text-zinc-500">Manage multi-channel messaging accounts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Connect Channel
          </button>
          <button
            onClick={() => { loadAccounts(); loadInbox(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                tab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ─── CONNECTED ACCOUNTS TAB ─── */}
      {tab === 'accounts' && (
        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          )}
          {!loading && accounts.length === 0 && (
            <div className="text-center py-16">
              <Radio className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">No channels connected yet</p>
              <button onClick={() => setShowAddModal(true)} className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                + Connect your first channel
              </button>
            </div>
          )}
          {!loading && accounts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map(acc => {
                const cfg = CHANNEL_CONFIG[acc.channel] || CHANNEL_CONFIG.slack;
                const Icon = cfg.icon;
                return (
                  <div key={acc.id} className="bg-white rounded-xl border border-zinc-200 p-4 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${cfg.color} flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-900">{acc.account_name}</h3>
                          <p className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleActive(acc.id, acc.is_active)}
                          className={`p-1.5 rounded-lg transition-colors ${acc.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-zinc-400 hover:bg-zinc-100'}`}
                          title={acc.is_active ? 'Active — click to disable' : 'Inactive — click to enable'}
                        >
                          {acc.is_active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(acc.id, acc.account_name)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${acc.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'}`}>
                        {acc.is_active ? 'Active' : 'Disabled'}
                      </span>
                      <span>Connected {new Date(acc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── INBOX TAB ─── */}
      {tab === 'inbox' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inboxSearch}
                onChange={(e) => setInboxSearch(e.target.value)}
                placeholder="Search messages..."
                className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <select
              value={inboxChannel}
              onChange={(e) => { setInboxChannel(e.target.value); setInboxPage(1); }}
              className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">All Channels</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
              <option value="discord">Discord</option>
              <option value="slack">Slack</option>
            </select>
          </div>

          {inboxLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          )}
          {!inboxLoading && filteredInbox.length === 0 && (
            <div className="text-center py-16">
              <Inbox className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">No inbound messages yet</p>
            </div>
          )}
          {!inboxLoading && filteredInbox.length > 0 && (
            <div className="space-y-2">
              {filteredInbox.map(msg => {
                const cfg = CHANNEL_CONFIG[msg.channel] || CHANNEL_CONFIG.slack;
                const Icon = cfg.icon;
                return (
                  <div key={msg.id} className="bg-white rounded-xl border border-zinc-200/60 px-5 py-4 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${cfg.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-zinc-900">{msg.sender_name || 'Unknown'}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${cfg.lightBg} ${cfg.text} font-medium`}>{cfg.label}</span>
                        </div>
                        <p className="text-sm text-zinc-600 truncate">{msg.body || '(no content)'}</p>
                        <span className="text-xs text-zinc-400">{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                      {msg.leads && (
                        <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex-shrink-0">
                          {msg.leads.name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {inboxTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button onClick={() => setInboxPage(p => Math.max(1, p - 1))} disabled={inboxPage === 1} className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40">Previous</button>
              <span className="text-sm text-zinc-500">Page {inboxPage} of {inboxTotalPages}</span>
              <button onClick={() => setInboxPage(p => Math.min(inboxTotalPages, p + 1))} disabled={inboxPage === inboxTotalPages} className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}

      {/* ─── EXPORT TAB ─── */}
      {tab === 'export' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-6 text-center">
            <Download className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Export Inbox Data</h3>
            <p className="text-sm text-zinc-500 mb-4">Download all inbound messages as a CSV file for analysis</p>
            <button
              onClick={handleExportInbox}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <Download className="w-4 h-4" /> Export as CSV
            </button>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-500" /> Webhook URLs
            </h3>
            <p className="text-xs text-zinc-500 mb-4">Use these URLs to receive inbound messages from your channels</p>
            <div className="space-y-3">
              {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const url = `${API_BASE}/api/channels/webhook/${key}`;
                return (
                  <div key={key} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-lg ${cfg.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-700">{cfg.label}</p>
                      <p className="text-xs text-zinc-400 font-mono truncate">{url}</p>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(url); toast.success('Copied!'); }}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex-shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD ACCOUNT MODAL ─── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">Connect Channel</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label htmlFor="ch-type" className="block text-sm font-medium text-zinc-700 mb-1">Channel</label>
                <select
                  id="ch-type"
                  value={addChannel}
                  onChange={(e) => { setAddChannel(e.target.value); setAddConfig({}); }}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ch-name" className="block text-sm font-medium text-zinc-700 mb-1">Account Name</label>
                <input
                  id="ch-name"
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Production WhatsApp"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              {(CHANNEL_FIELDS[addChannel] || []).map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{field.label}</label>
                  <input
                    type={field.secret ? 'password' : 'text'}
                    value={addConfig[field.key] || ''}
                    onChange={(e) => setAddConfig({ ...addConfig, [field.key]: e.target.value })}
                    placeholder={field.secret ? '••••••••' : `Enter ${field.label.toLowerCase()}`}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-zinc-200">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleAddAccount} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">Connect</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
