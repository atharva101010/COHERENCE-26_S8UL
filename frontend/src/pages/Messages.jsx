import { useState, useEffect } from 'react';
import {
  MessageSquare, Search, RefreshCw, Mail, Bot, Clock,
  CheckCircle2, XCircle, AlertTriangle, Ban, Loader2,
  ChevronRight, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const STATUS_CONFIG = {
  sent: { color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
  delivered: { color: 'bg-blue-50 text-blue-600', icon: CheckCircle2 },
  opened: { color: 'bg-indigo-50 text-indigo-600', icon: Mail },
  draft: { color: 'bg-zinc-100 text-zinc-500', icon: Clock },
  failed: { color: 'bg-red-50 text-red-600', icon: XCircle },
  blocked: { color: 'bg-amber-50 text-amber-700', icon: Ban },
  rate_limited: { color: 'bg-orange-50 text-orange-600', icon: AlertTriangle },
  ai_generated: { color: 'bg-violet-50 text-violet-600', icon: Bot },
};

const TYPE_LABELS = {
  email: 'Email',
  ai_generated: 'AI Generated',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  discord: 'Discord',
};

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      params.set('page', String(page));
      params.set('limit', '30');

      const res = await fetch(`${API_BASE}/api/messages?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      setMessages(data.messages || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [page, statusFilter, typeFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadMessages();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-indigo-600" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">Messages</h2>
            <p className="text-sm text-zinc-500">{total} messages total</p>
          </div>
        </div>
        <button
          onClick={() => { setPage(1); loadMessages(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject or body..."
            className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </form>
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-zinc-400" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="opened">Opened</option>
            <option value="draft">Draft</option>
            <option value="failed">Failed</option>
            <option value="blocked">Blocked</option>
            <option value="rate_limited">Rate Limited</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="all">All Types</option>
            <option value="email">Email</option>
            <option value="ai_generated">AI Generated</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="telegram">Telegram</option>
            <option value="discord">Discord</option>
          </select>
        </div>
      </div>

      {/* Messages List */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      )}
      {!loading && messages.length === 0 && (
        <div className="text-center py-16">
          <MessageSquare className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">No messages found</p>
        </div>
      )}
      {!loading && messages.length > 0 && (
        <div className="space-y-2">
          {messages.map((msg) => {
            const cfg = STATUS_CONFIG[msg.status] || STATUS_CONFIG.draft;
            const StatusIcon = cfg.icon;
            const expanded = expandedId === msg.id;
            return (
              <div key={msg.id} className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden hover:shadow-md transition-all">
                <button
                  onClick={() => setExpandedId(expanded ? null : msg.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left"
                >
                  <StatusIcon className={`w-4 h-4 flex-shrink-0 ${cfg.color.split(' ')[1]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-zinc-900 truncate">
                        {msg.subject || '(No subject)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      {msg.leads && <span>To: {msg.leads.name} ({msg.leads.email})</span>}
                      <span>{TYPE_LABELS[msg.type] || msg.type}</span>
                      <span>{new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${cfg.color}`}>
                    {msg.status}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                </button>
                {expanded && (
                  <div className="px-5 pb-4 border-t border-zinc-100">
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                      <div>
                        <span className="text-zinc-400">Type</span>
                        <p className="text-zinc-700 font-medium mt-0.5">{TYPE_LABELS[msg.type] || msg.type}</p>
                      </div>
                      <div>
                        <span className="text-zinc-400">Status</span>
                        <p className="text-zinc-700 font-medium mt-0.5 capitalize">{msg.status}</p>
                      </div>
                      <div>
                        <span className="text-zinc-400">Created</span>
                        <p className="text-zinc-700 font-medium mt-0.5">{new Date(msg.created_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-zinc-400">Channel</span>
                        <p className="text-zinc-700 font-medium mt-0.5">{msg.channel || 'email'}</p>
                      </div>
                    </div>
                    {msg.body && (
                      <div className="bg-zinc-50 rounded-lg p-4 text-sm text-zinc-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
                        {msg.body}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
