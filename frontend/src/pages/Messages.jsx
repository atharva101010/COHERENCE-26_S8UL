import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Search, RefreshCw, Mail, Bot, Clock,
  CheckCircle2, XCircle, AlertTriangle, Ban,
  ChevronRight, Filter, AlertCircle, Inbox
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchMessages } from '../lib/supabaseService';

const STATUS_CONFIG = {
  sent: { color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
  delivered: { color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', icon: CheckCircle2 },
  opened: { color: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400', icon: Mail },
  draft: { color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400', icon: Clock },
  failed: { color: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400', icon: XCircle },
  blocked: { color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', icon: Ban },
  rate_limited: { color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400', icon: AlertTriangle },
  ai_generated: { color: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400', icon: Bot },
};

const TYPE_LABELS = {
  email: 'Email',
  ai_generated: 'AI Generated',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  discord: 'Discord',
};

function formatNumber(n) {
  return Number(n || 0).toLocaleString();
}

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  const loadMessages = useCallback(async (overrides = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: overrides.page ?? page,
        limit: 30,
      };
      const s = overrides.search ?? search;
      const st = overrides.status ?? statusFilter;
      const tp = overrides.type ?? typeFilter;
      if (s) params.search = s;
      if (st !== 'all') params.status = st;
      if (tp !== 'all') params.type = tp;

      const data = await fetchMessages(params);
      setMessages(data.messages || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch messages');
      toast.error(err.message || 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => {
    loadMessages();
  }, [page, statusFilter, typeFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadMessages({ page: 1 });
  };

  const handleRefresh = () => {
    setPage(1);
    loadMessages({ page: 1 });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Messages</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{formatNumber(total)} messages total</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
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
            className="w-full pl-9 pr-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </form>
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-zinc-400" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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
            className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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

      {/* Error State */}
      {!loading && error && (
        <div className="rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Failed to load messages</h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-3 flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 px-5 py-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 rounded-full bg-zinc-200 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-zinc-200 rounded w-1/3 mb-2" />
                  <div className="flex items-center gap-3">
                    <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-40" />
                    <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-16" />
                    <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-28" />
                  </div>
                </div>
                <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded-lg w-16" />
                <div className="w-4 h-4 bg-zinc-100 dark:bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && messages.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">No messages found</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 max-w-sm mx-auto">
            {search || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your search or filters to find messages.'
              : 'Messages will appear here once workflows send emails or generate AI content.'}
          </p>
          {(search || statusFilter !== 'all' || typeFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); setPage(1); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:bg-indigo-900/30 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Messages List */}
      {!loading && !error && messages.length > 0 && (
        <div className="space-y-2">
          {messages.map((msg) => {
            const cfg = STATUS_CONFIG[msg.status] || STATUS_CONFIG.draft;
            const StatusIcon = cfg.icon;
            const expanded = expandedId === msg.id;
            return (
              <div key={msg.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 overflow-hidden hover:shadow-md transition-all">
                <button
                  onClick={() => setExpandedId(expanded ? null : msg.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left"
                >
                  <StatusIcon className={`w-4 h-4 flex-shrink-0 ${cfg.color.split(' ')[1]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
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
                  <div className="px-5 pb-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                      <div>
                        <span className="text-zinc-400">Type</span>
                        <p className="text-zinc-700 dark:text-zinc-300 font-medium mt-0.5">{TYPE_LABELS[msg.type] || msg.type}</p>
                      </div>
                      <div>
                        <span className="text-zinc-400">Status</span>
                        <p className="text-zinc-700 dark:text-zinc-300 font-medium mt-0.5 capitalize">{msg.status}</p>
                      </div>
                      <div>
                        <span className="text-zinc-400">Created</span>
                        <p className="text-zinc-700 dark:text-zinc-300 font-medium mt-0.5">{new Date(msg.created_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-zinc-400">Channel</span>
                        <p className="text-zinc-700 dark:text-zinc-300 font-medium mt-0.5">{msg.channel || 'email'}</p>
                      </div>
                    </div>
                    {msg.body && (
                      <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
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
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
