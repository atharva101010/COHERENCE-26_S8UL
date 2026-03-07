import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Radio, Plus, Trash2, RefreshCw, Loader2, Search,
  MessageSquare, Send, Hash, CheckCircle2, XCircle,
  Settings, Download, Inbox, Link2, X, AlertCircle
} from 'lucide-react';
import {
  fetchChannelAccounts,
  createChannelAccount,
  updateChannelAccount,
  deleteChannelAccount,
  fetchChannelInbox,
} from '../lib/supabaseService';

const API_BASE = import.meta.env.VITE_API_URL || '';

const CHANNEL_CONFIG = {
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'bg-emerald-500', lightBg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
  telegram: { label: 'Telegram', icon: Send, color: 'bg-sky-500', lightBg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400' },
  discord:  { label: 'Discord', icon: Hash, color: 'bg-indigo-500', lightBg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' },
  slack:    { label: 'Slack', icon: MessageSquare, color: 'bg-green-600', lightBg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
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
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addChannel, setAddChannel] = useState('whatsapp');
  const [addName, setAddName] = useState('');
  const [addConfig, setAddConfig] = useState({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Inbox state
  const [inboxMessages, setInboxMessages] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [inboxError, setInboxError] = useState(null);
  const [inboxChannel, setInboxChannel] = useState('');
  const [inboxSearch, setInboxSearch] = useState('');
  const [inboxPage, setInboxPage] = useState(1);
  const [inboxTotalPages, setInboxTotalPages] = useState(1);

  // Export state
  const [exporting, setExporting] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchChannelAccounts();
      setAccounts(data.accounts || []);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadInbox = async () => {
    setInboxLoading(true);
    setInboxError(null);
    try {
      const data = await fetchChannelInbox({
        channel: inboxChannel || undefined,
        page: inboxPage,
        limit: 30,
      });
      setInboxMessages(data.messages || []);
      setInboxTotalPages(data.totalPages || 1);
    } catch (err) {
      setInboxError(err.message);
      toast.error(err.message);
    } finally {
      setInboxLoading(false);
    }
  };

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => { if (tab === 'inbox') loadInbox(); }, [tab, inboxChannel, inboxPage]);

  const handleAddAccount = async () => {
    if (!addName.trim()) { toast.error('Account name is required'); return; }
    setSaving(true);
    try {
      await createChannelAccount({ channel: addChannel, account_name: addName.trim(), config: addConfig });
      toast.success(`${CHANNEL_CONFIG[addChannel]?.label} account connected`);
      setShowAddModal(false);
      setAddName('');
      setAddConfig({});
      loadAccounts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (id, name) => {
    if (!globalThis.confirm(`Disconnect "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteChannelAccount(id);
      toast.success(`Disconnected ${name}`);
      setAccounts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (id, isActive) => {
    setTogglingId(id);
    try {
      const updated = await updateChannelAccount(id, { is_active: !isActive });
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));
      toast.success(isActive ? 'Channel disabled' : 'Channel enabled');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleExportInbox = async () => {
    setExporting(true);
    try {
      const data = await fetchChannelInbox({ channel: inboxChannel || undefined, page: 1, limit: 10000 });
      const messages = data.messages || [];
      if (messages.length === 0) {
        toast.error('No messages to export');
        return;
      }
      const csv = [
        ['ID', 'Channel', 'Sender', 'Body', 'Date'].join(','),
        ...messages.map(m => [
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
      toast.success(`Exported ${messages.length.toLocaleString()} messages`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
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
          <Radio className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Channels</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage multi-channel messaging accounts</p>
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
            onClick={() => { loadAccounts(); if (tab === 'inbox') loadInbox(); }}
            disabled={loading || inboxLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || inboxLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                tab === t.id ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300'
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
          {/* Error state */}
          {error && !loading && (
            <div className="border border-red-300 bg-red-50 dark:bg-red-900/30 rounded-xl p-5 flex items-center gap-4">
              <AlertCircle className="text-red-500 shrink-0" size={24} />
              <div className="flex-1">
                <p className="font-medium text-red-800 dark:text-red-300">Failed to load accounts</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
              </div>
              <button onClick={loadAccounts} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1.5">
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {/* Skeleton loading */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-200 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-zinc-200 rounded animate-pulse w-32" />
                      <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-20" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-5 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse w-16" />
                    <div className="h-5 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-28" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && accounts.length === 0 && (
            <div className="text-center py-16">
              <Radio className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
              <p className="font-medium text-zinc-600 dark:text-zinc-400">No channels connected yet</p>
              <p className="text-sm text-zinc-400 mt-1 mb-4">Connect your first messaging channel to start receiving inbound messages.</p>
              <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                <Plus className="w-3.5 h-3.5" /> Connect your first channel
              </button>
            </div>
          )}

          {!loading && !error && accounts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map(acc => {
                const cfg = CHANNEL_CONFIG[acc.channel] || CHANNEL_CONFIG.slack;
                const Icon = cfg.icon;
                return (
                  <div key={acc.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${cfg.color} flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{acc.account_name}</h3>
                          <p className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleActive(acc.id, acc.is_active)}
                          disabled={togglingId === acc.id}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${acc.is_active ? 'text-emerald-500 hover:bg-emerald-50 dark:bg-emerald-900/30' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                          title={acc.is_active ? 'Active — click to disable' : 'Inactive — click to enable'}
                        >
                          {togglingId === acc.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : (acc.is_active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />)
                          }
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(acc.id, acc.account_name)}
                          disabled={deletingId === acc.id}
                          className="p-1.5 text-zinc-400 hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {deletingId === acc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${acc.is_active ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
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
                className="w-full pl-9 pr-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <select
              value={inboxChannel}
              onChange={(e) => { setInboxChannel(e.target.value); setInboxPage(1); }}
              className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">All Channels</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
              <option value="discord">Discord</option>
              <option value="slack">Slack</option>
            </select>
          </div>

          {/* Error state */}
          {inboxError && !inboxLoading && (
            <div className="border border-red-300 bg-red-50 dark:bg-red-900/30 rounded-xl p-5 flex items-center gap-4">
              <AlertCircle className="text-red-500 shrink-0" size={24} />
              <div className="flex-1">
                <p className="font-medium text-red-800 dark:text-red-300">Failed to load inbox</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{inboxError}</p>
              </div>
              <button onClick={loadInbox} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1.5">
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {/* Skeleton loading */}
          {inboxLoading && (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-200 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-4 bg-zinc-200 rounded animate-pulse w-24" />
                        <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse w-16" />
                      </div>
                      <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-32" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!inboxLoading && !inboxError && filteredInbox.length === 0 && (
            <div className="text-center py-16">
              <Inbox className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
              <p className="font-medium text-zinc-600 dark:text-zinc-400">No inbound messages yet</p>
              <p className="text-sm text-zinc-400 mt-1">Messages received through your connected channels will appear here.</p>
            </div>
          )}

          {!inboxLoading && !inboxError && filteredInbox.length > 0 && (
            <div className="space-y-2">
              {filteredInbox.map(msg => {
                const cfg = CHANNEL_CONFIG[msg.channel] || CHANNEL_CONFIG.slack;
                const Icon = cfg.icon;
                return (
                  <div key={msg.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 px-5 py-4 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${cfg.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{msg.sender_name || 'Unknown'}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${cfg.lightBg} ${cfg.text} font-medium`}>{cfg.label}</span>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{msg.body || '(no content)'}</p>
                        <span className="text-xs text-zinc-400">{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                      {msg.leads && (
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full flex-shrink-0">
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
              <button onClick={() => setInboxPage(p => Math.max(1, p - 1))} disabled={inboxPage === 1} className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40">Previous</button>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Page {inboxPage} of {inboxTotalPages}</span>
              <button onClick={() => setInboxPage(p => Math.min(inboxTotalPages, p + 1))} disabled={inboxPage === inboxTotalPages} className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}

      {/* ─── EXPORT TAB ─── */}
      {tab === 'export' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 text-center">
            <Download className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Export Inbox Data</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Download all inbound messages as a CSV file for analysis</p>
            <button
              onClick={handleExportInbox}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export as CSV
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-500" /> Webhook URLs
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Use these URLs to receive inbound messages from your channels</p>
            <div className="space-y-3">
              {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const url = `${API_BASE}/api/channels/webhook/${key}`;
                return (
                  <div key={key} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <div className={`w-8 h-8 rounded-lg ${cfg.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{cfg.label}</p>
                      <p className="text-xs text-zinc-400 font-mono truncate">{url}</p>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(url); toast.success('Copied!'); }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:text-indigo-300 font-medium flex-shrink-0"
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
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Connect Channel</h3>
              <button onClick={() => !saving && setShowAddModal(false)} disabled={saving} className="p-1 text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label htmlFor="ch-type" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Channel</label>
                <select
                  id="ch-type"
                  value={addChannel}
                  onChange={(e) => { setAddChannel(e.target.value); setAddConfig({}); }}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ch-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Account Name</label>
                <input
                  id="ch-name"
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Production WhatsApp"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              {(CHANNEL_FIELDS[addChannel] || []).map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{field.label}</label>
                  <input
                    type={field.secret ? 'password' : 'text'}
                    value={addConfig[field.key] || ''}
                    onChange={(e) => setAddConfig({ ...addConfig, [field.key]: e.target.value })}
                    placeholder={field.secret ? '••••••••' : `Enter ${field.label.toLowerCase()}`}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-zinc-200 dark:border-zinc-700">
              <button onClick={() => setShowAddModal(false)} disabled={saving} className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleAddAccount} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
