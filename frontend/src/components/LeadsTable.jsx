import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchLeads as fetchLeadsFromDB } from '../lib/supabaseService';

const STATUS_COLORS = {
  new: 'bg-indigo-50 text-indigo-600 ring-indigo-500/20',
  contacted: 'bg-amber-50 text-amber-600 ring-amber-500/20',
  replied: 'bg-green-50 text-green-600 ring-green-500/20',
  converted: 'bg-emerald-50 text-emerald-600 ring-emerald-500/20',
  bounced: 'bg-red-50 text-red-600 ring-red-500/20',
  unsubscribed: 'bg-zinc-50 text-zinc-500 ring-zinc-500/20',
};

export default function LeadsTable({ refreshTrigger }) { // eslint-disable-line react/prop-types
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchLeadsFromDB({ search, status: statusFilter, page, limit: 50 });
      setLeads(res.leads);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch leads');
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

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/60 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-zinc-200/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Search leads..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200/60 rounded-xl bg-zinc-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-zinc-200/60 rounded-xl bg-zinc-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
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
          <span className="text-sm text-zinc-500">{total} leads</span>
          <button
            onClick={fetchLeads}
            className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200/60 bg-zinc-50/50">
              <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Email</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Company</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Title</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Added</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-zinc-400">
                  No leads found. Import a CSV or Excel file to get started.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="border-b border-zinc-100/60 hover:bg-indigo-50/30 transition-all duration-150">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{lead.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-sm font-medium text-zinc-900">{lead.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-zinc-500">{lead.email}</td>
                  <td className="py-3 px-4 text-sm text-zinc-500">{lead.company || '—'}</td>
                  <td className="py-3 px-4 text-sm text-zinc-500">{lead.title || '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ring-1 ${STATUS_COLORS[lead.status] || 'bg-zinc-50 text-zinc-500 ring-zinc-200'}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-400 text-xs">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-zinc-200/60 flex items-center justify-between">
          <span className="text-sm text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
