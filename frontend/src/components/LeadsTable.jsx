import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, ChevronLeft, ChevronRight, Trash2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchLeads as fetchLeadsFromDB, updateLead, deleteLead } from '../lib/supabaseService';

const STATUS_COLORS = {
  new: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20',
  contacted: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 ring-amber-500/20',
  replied: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 ring-green-500/20',
  converted: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
  bounced: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 ring-red-500/20',
  unsubscribed: 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 ring-zinc-500/20',
};

const STATUS_OPTIONS = ['new', 'contacted', 'replied', 'converted', 'bounced', 'unsubscribed'];

function SkeletonRow() {
  return (
    <tr className="border-b border-zinc-100/60">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-200 animate-pulse" />
          <div className="h-4 w-28 bg-zinc-200 rounded animate-pulse" />
        </div>
      </td>
      <td className="py-3 px-4"><div className="h-4 w-40 bg-zinc-200 rounded animate-pulse" /></td>
      <td className="py-3 px-4"><div className="h-4 w-24 bg-zinc-200 rounded animate-pulse" /></td>
      <td className="py-3 px-4"><div className="h-4 w-24 bg-zinc-200 rounded animate-pulse" /></td>
      <td className="py-3 px-4"><div className="h-5 w-20 bg-zinc-200 rounded-lg animate-pulse" /></td>
      <td className="py-3 px-4"><div className="h-4 w-20 bg-zinc-200 rounded animate-pulse" /></td>
      <td className="py-3 px-4"><div className="h-4 w-8 bg-zinc-200 rounded animate-pulse" /></td>
    </tr>
  );
}

function TableBody({ leads, updatingId, handleStatusChange, confirmDeleteId, setConfirmDeleteId, deletingId, handleDelete }) { // eslint-disable-line react/prop-types
  if (leads.length === 0) {
    return (
      <tr>
        <td colSpan={7} className="text-center py-12 text-zinc-400">
          No leads found. Import a CSV or Excel file to get started.
        </td>
      </tr>
    );
  }
  return leads.map((lead) => (
    <tr key={lead.id} className="border-b border-zinc-100/60 hover:bg-indigo-50/30 transition-all duration-150 group">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{lead.name.charAt(0).toUpperCase()}</span>
          </div>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{lead.name}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-zinc-500 dark:text-zinc-400">{lead.email}</td>
      <td className="py-3 px-4 text-sm text-zinc-500 dark:text-zinc-400">{lead.company || '—'}</td>
      <td className="py-3 px-4 text-sm text-zinc-500 dark:text-zinc-400">{lead.title || '—'}</td>
      <td className="py-3 px-4">
        <select
          value={lead.status}
          disabled={updatingId === lead.id}
          onChange={(e) => handleStatusChange(lead, e.target.value)}
          className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ring-1 border-0 cursor-pointer disabled:opacity-50 disabled:cursor-wait ${STATUS_COLORS[lead.status] || 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 ring-zinc-200 dark:ring-zinc-700'}`}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </td>
      <td className="py-3 px-4 text-zinc-400 text-xs">
        {new Date(lead.created_at).toLocaleDateString()}
      </td>
      <td className="py-3 px-4">
        {confirmDeleteId === lead.id ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleDelete(lead.id)}
              disabled={deletingId === lead.id}
              className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {deletingId === lead.id ? '...' : 'Yes'}
            </button>
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="px-2 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDeleteId(lead.id)}
            className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:bg-red-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            title="Delete lead"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
    </tr>
  ));
}

export default function LeadsTable({ refreshTrigger }) { // eslint-disable-line react/prop-types
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLeadsFromDB({ search, status: statusFilter, page, limit: 50 });
      setLeads(res.leads);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err.message || 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads, refreshTrigger]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusChange = async (lead, newStatus) => {
    if (newStatus === lead.status) return;
    setUpdatingId(lead.id);
    try {
      const updated = await updateLead(lead.id, { status: newStatus });
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, ...updated } : l)));
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setTotal((prev) => prev - 1);
      toast.success('Lead deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete lead');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  // Error state
  if (error && !loading && leads.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 p-12 text-center">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Failed to load leads</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{error}</p>
        <button
          onClick={fetchLeads}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Search leads..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200/60 dark:border-zinc-700/60 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-zinc-200/60 dark:border-zinc-700/60 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="replied">Replied</option>
            <option value="converted">Converted</option>
            <option value="bounced">Bounced</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{total} leads</span>
          <button
            onClick={fetchLeads}
            className="p-2 text-zinc-400 hover:text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:bg-indigo-900/30 rounded-xl transition-all duration-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200/60 dark:border-zinc-700/60 bg-zinc-50/50 dark:bg-zinc-800/50">
              <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Name</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Email</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Company</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Title</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Added</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-12"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={`skel-${String(i)}`} />)
            ) : (
              <TableBody leads={leads} updatingId={updatingId} handleStatusChange={handleStatusChange} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} deletingId={deletingId} handleDelete={handleDelete} />
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
