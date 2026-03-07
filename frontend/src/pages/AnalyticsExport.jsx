import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Download, FileSpreadsheet, FileJson, BarChart3, Loader,
  RefreshCw, Trash2, Clock, AlertCircle
} from 'lucide-react';
import {
  fetchAnalyticsExport,
  fetchExportHistory,
  logExport,
  deleteExportRecord,
} from '../lib/supabaseService';

const STATUS_COLORS = {
  new: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  contacted: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  replied: 'bg-green-100 text-green-700 dark:text-green-300',
  converted: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  bounced: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  unsubscribed: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
};

const EXPORT_TYPE_LABELS = {
  json: 'Full JSON',
  leads_csv: 'Leads CSV',
  messages_csv: 'Messages CSV',
  executions_csv: 'Executions CSV',
  workflows_csv: 'Workflows CSV',
};

function formatNumber(n) {
  return Number(n || 0).toLocaleString();
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
      <div className="h-3 w-20 bg-muted rounded mb-2" />
      <div className="h-7 w-16 bg-muted rounded" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-border">
      <td className="px-4 py-2"><div className="h-4 w-28 bg-muted rounded animate-pulse" /></td>
      <td className="px-4 py-2"><div className="h-4 w-36 bg-muted rounded animate-pulse" /></td>
      <td className="px-4 py-2"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
      <td className="px-4 py-2"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></td>
    </tr>
  );
}

function PreviewCell({ cell }) {
  if (cell && typeof cell === 'object' && cell.badge) {
    return (
      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full capitalize ${STATUS_COLORS[cell.value] || 'bg-secondary text-secondary-foreground'}`}>
        {cell.value}
      </span>
    );
  }
  return <span className="text-muted-foreground">{cell ?? '—'}</span>;
}

function HistoryTableBody({ historyLoading, history, handleDeleteExport, deletingId }) {
  if (historyLoading) {
    return [1, 2, 3].map(i => (
      <tr key={i} className="border-b border-border">
        <td className="px-4 py-2"><div className="h-4 w-20 bg-muted rounded animate-pulse" /></td>
        <td className="px-4 py-2"><div className="h-4 w-40 bg-muted rounded animate-pulse" /></td>
        <td className="px-4 py-2"><div className="h-4 w-12 bg-muted rounded animate-pulse" /></td>
        <td className="px-4 py-2"><div className="h-4 w-14 bg-muted rounded animate-pulse" /></td>
        <td className="px-4 py-2"><div className="h-4 w-28 bg-muted rounded animate-pulse" /></td>
        <td className="px-4 py-2"><div className="h-4 w-8 bg-muted rounded animate-pulse ml-auto" /></td>
      </tr>
    ));
  }
  if (history.length === 0) {
    return (
      <tr>
        <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
          <Download size={24} className="mx-auto mb-2 opacity-30" />
          No exports yet — download a file above to see it here
        </td>
      </tr>
    );
  }
  return history.map(h => (
    <tr key={h.id} className="border-b border-border last:border-0">
      <td className="px-4 py-2">
        <span className="px-2 py-0.5 text-[10px] font-medium bg-secondary rounded-full">
          {EXPORT_TYPE_LABELS[h.export_type] || h.export_type}
        </span>
      </td>
      <td className="px-4 py-2 text-sm text-muted-foreground truncate max-w-[200px]">{h.file_name}</td>
      <td className="px-4 py-2 text-sm">{formatNumber(h.record_count)}</td>
      <td className="px-4 py-2 text-sm text-muted-foreground">{formatBytes(h.file_size_bytes)}</td>
      <td className="px-4 py-2 text-xs text-muted-foreground">{formatDate(h.created_at)}</td>
      <td className="px-4 py-2 text-right">
        <button
          onClick={() => handleDeleteExport(h.id)}
          disabled={deletingId === h.id}
          className="p-1 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
          title="Remove record"
        >
          {deletingId === h.id ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </td>
    </tr>
  ));
}

function ExportContent({
  data, loading, downloading, downloadJSON, downloadCSV,
  previewTab, setPreviewTab, previewData, currentPreview,
  historyLoading, history, loadHistory, handleDeleteExport, deletingId,
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: data.summary?.totalLeads || 0, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Total Messages', value: data.summary?.totalMessages || 0, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Executions', value: data.summary?.totalExecutions || 0, color: 'text-purple-600 dark:text-purple-400' },
          { label: 'Workflows', value: data.summary?.totalWorkflows || 0, color: 'text-green-600 dark:text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{formatNumber(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Additional summary row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Sent Messages</p>
          <p className="text-lg font-bold mt-1">{formatNumber(data.summary?.sentCount || 0)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Failed Messages</p>
          <p className="text-lg font-bold mt-1 text-red-500">{formatNumber(data.summary?.failedCount || 0)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Completed Executions</p>
          <p className="text-lg font-bold mt-1 text-emerald-600 dark:text-emerald-400">{formatNumber(data.summary?.completedExecs || 0)}</p>
        </div>
      </div>

      {/* Lead Status Breakdown */}
      {data.leadsByStatus && Object.keys(data.leadsByStatus).length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Leads by Status</h3>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(data.leadsByStatus).map(([status, count]) => (
              <div key={status} className="px-4 py-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground capitalize">{status}</p>
                <p className="text-lg font-bold">{formatNumber(count)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold">Download Options</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <button
            onClick={downloadJSON}
            disabled={downloading === 'json'}
            className="flex items-center gap-2 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl text-sm font-medium hover:bg-indigo-100 dark:bg-indigo-900/40 transition-colors disabled:opacity-50"
          >
            {downloading === 'json' ? <Loader size={16} className="animate-spin" /> : <FileJson size={16} />}
            Full JSON
          </button>
          {['leads', 'messages', 'executions', 'workflows'].map((type) => {
            const colors = {
              leads: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100',
              messages: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:bg-amber-900/40',
              executions: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100',
              workflows: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 hover:bg-cyan-100',
            };
            return (
              <button
                key={type}
                onClick={() => downloadCSV(type)}
                disabled={downloading === type}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${colors[type]}`}
              >
                {downloading === type ? <Loader size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                {type.charAt(0).toUpperCase() + type.slice(1)} CSV
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Preview with Tabs */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-1">
            {['leads', 'messages', 'executions', 'workflows'].map((tab) => (
              <button
                key={tab}
                onClick={() => setPreviewTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
                  previewTab === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {tab} ({formatNumber(previewData[tab].total)})
              </button>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">
            Fetched {formatDate(data.exportedAt)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {currentPreview.headers.map(h => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentPreview.rows.length === 0 ? (
                <tr>
                  <td colSpan={currentPreview.headers.length} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No {previewTab} data available
                  </td>
                </tr>
              ) : (
                currentPreview.rows.map(row => (
                  <tr key={row.key} className="border-b border-border last:border-0">
                    {row.cells.map((cell, cellIdx) => (
                      <td key={`${row.key}-${currentPreview.headers[cellIdx]}`} className="px-4 py-2 text-sm">
                        <PreviewCell cell={cell} />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {currentPreview.total > 10 && (
          <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground text-center">
            Showing 10 of {formatNumber(currentPreview.total)} records — download CSV for full data
          </div>
        )}
      </div>

      {/* Export History */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock size={14} className="text-muted-foreground" /> Export History
          </h3>
          <button
            onClick={loadHistory}
            disabled={historyLoading}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <RefreshCw size={12} className={historyLoading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Type</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">File Name</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Records</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Size</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Exported At</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              <HistoryTableBody
                historyLoading={historyLoading}
                history={history}
                handleDeleteExport={handleDeleteExport}
                deletingId={deletingId}
              />
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function AnalyticsExport() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [previewTab, setPreviewTab] = useState('leads');
  const [downloading, setDownloading] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAnalyticsExport();
      setData(result);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const result = await fetchExportHistory();
      setHistory(result);
    } catch {
      // History is non-critical, silently handle
      setHistory([]);
    }
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    loadHistory();
  }, [loadData, loadHistory]);

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = async () => {
    if (!data) return;
    setDownloading('json');
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const filename = `flowreach-analytics-${new Date().toISOString().slice(0, 10)}.json`;
      triggerDownload(blob, filename);
      await logExport({
        export_type: 'json',
        record_count: (data.leads?.length || 0) + (data.messages?.length || 0) + (data.executions?.length || 0),
        file_name: filename,
        file_size_bytes: blob.size,
      });
      await loadHistory();
      toast.success('Full JSON export downloaded');
    } catch (err) {
      toast.error(err.message);
    }
    setDownloading(null);
  };

  const downloadCSV = async (type) => {
    if (!data) return;
    setDownloading(type);
    try {
      let rows = [];
      let filename = '';
      let exportType = '';
      let recordCount = 0;

      if (type === 'leads') {
        const headers = ['ID', 'Name', 'Email', 'Company', 'Title', 'Status', 'Source', 'Created At'];
        const body = (data.leads || []).map(l => [
          l.id, l.name, l.email, l.company || '', l.title || '', l.status, l.source || '', l.created_at || '',
        ]);
        rows = [headers, ...body];
        filename = `flowreach-leads-${new Date().toISOString().slice(0, 10)}.csv`;
        exportType = 'leads_csv';
        recordCount = body.length;
      } else if (type === 'messages') {
        const headers = ['ID', 'Lead ID', 'Channel', 'Status', 'Subject', 'Created At', 'Opened At'];
        const body = (data.messages || []).map(m => [
          m.id, m.lead_id, m.channel || 'email', m.status, m.subject || '', m.created_at || '', m.opened_at || '',
        ]);
        rows = [headers, ...body];
        filename = `flowreach-messages-${new Date().toISOString().slice(0, 10)}.csv`;
        exportType = 'messages_csv';
        recordCount = body.length;
      } else if (type === 'executions') {
        const headers = ['ID', 'Workflow ID', 'Lead ID', 'Status', 'Started At', 'Completed At'];
        const body = (data.executions || []).map(e => [
          e.id, e.workflow_id, e.lead_id, e.status, e.started_at || e.created_at || '', e.completed_at || '',
        ]);
        rows = [headers, ...body];
        filename = `flowreach-executions-${new Date().toISOString().slice(0, 10)}.csv`;
        exportType = 'executions_csv';
        recordCount = body.length;
      } else if (type === 'workflows') {
        const headers = ['ID', 'Name', 'Active', 'Created At'];
        const body = (data.workflows || []).map(w => [
          w.id, w.name, w.is_active ? 'Yes' : 'No', w.created_at || '',
        ]);
        rows = [headers, ...body];
        filename = `flowreach-workflows-${new Date().toISOString().slice(0, 10)}.csv`;
        exportType = 'workflows_csv';
        recordCount = body.length;
      }

      const csv = rows.map(r => r.map(c => `"${String(c ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      triggerDownload(blob, filename);

      await logExport({
        export_type: exportType,
        record_count: recordCount,
        file_name: filename,
        file_size_bytes: blob.size,
      });
      await loadHistory();
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} CSV downloaded (${formatNumber(recordCount)} records)`);
    } catch (err) {
      toast.error(err.message);
    }
    setDownloading(null);
  };

  const handleDeleteExport = async (id) => {
    setDeletingId(id);
    try {
      await deleteExportRecord(id);
      setHistory(prev => prev.filter(h => h.id !== id));
      toast.success('Export record removed');
    } catch (err) {
      toast.error(err.message);
    }
    setDeletingId(null);
  };

  const previewData = {
    leads: {
      headers: ['Name', 'Email', 'Company', 'Status'],
      rows: (data?.leads || []).slice(0, 10).map(l => ({
        key: l.id,
        cells: [
          l.name,
          l.email,
          l.company || '—',
          { badge: true, value: l.status },
        ],
      })),
      total: data?.leads?.length || 0,
    },
    messages: {
      headers: ['Subject', 'Channel', 'Status', 'Created'],
      rows: (data?.messages || []).slice(0, 10).map(m => ({
        key: m.id,
        cells: [
          m.subject || '(no subject)',
          m.channel || 'email',
          { badge: true, value: m.status },
          formatDate(m.created_at),
        ],
      })),
      total: data?.messages?.length || 0,
    },
    executions: {
      headers: ['Workflow ID', 'Lead ID', 'Status', 'Started'],
      rows: (data?.executions || []).slice(0, 10).map(e => ({
        key: e.id,
        cells: [
          e.workflow_id,
          e.lead_id,
          { badge: true, value: e.status },
          formatDate(e.started_at || e.created_at),
        ],
      })),
      total: data?.executions?.length || 0,
    },
    workflows: {
      headers: ['Name', 'Active', 'Created'],
      rows: (data?.workflows || []).slice(0, 10).map(w => ({
        key: w.id,
        cells: [
          w.name,
          w.is_active ? 'Yes' : 'No',
          formatDate(w.created_at),
        ],
      })),
      total: data?.workflows?.length || 0,
    },
  };

  const currentPreview = previewData[previewTab];

  // Error state
  if (error && !data) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="text-primary" /> Analytics Export
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Export your data in CSV or JSON format</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <AlertCircle size={40} className="mx-auto mb-3 text-red-400" />
          <p className="text-red-700 dark:text-red-300 font-medium mb-1">Failed to load analytics data</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 inline-flex items-center gap-2"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="text-primary" /> Analytics Export
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Export your data in CSV or JSON format</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {loading ? 'Loading...' : 'Refresh Data'}
        </button>
      </div>

      <ExportContent
        data={data}
        loading={loading}
        downloading={downloading}
        downloadJSON={downloadJSON}
        downloadCSV={downloadCSV}
        previewTab={previewTab}
        setPreviewTab={setPreviewTab}
        previewData={previewData}
        currentPreview={currentPreview}
        historyLoading={historyLoading}
        history={history}
        loadHistory={loadHistory}
        handleDeleteExport={handleDeleteExport}
        deletingId={deletingId}
      />
    </div>
  );
}
