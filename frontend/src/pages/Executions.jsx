import { useState, useEffect, useCallback } from 'react';
import {
  Play, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  ChevronRight, Zap, Mail, Bot, ArrowRight, Loader2
} from 'lucide-react';
import { fetchExecutions, fetchWorkflows } from '../lib/supabaseService';

const STATUS_CONFIG = {
  pending:   { color: 'bg-zinc-100 text-zinc-600', icon: Clock, dot: 'bg-zinc-400' },
  running:   { color: 'bg-blue-50 text-blue-600', icon: Loader2, dot: 'bg-blue-500' },
  completed: { color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2, dot: 'bg-emerald-500' },
  failed:    { color: 'bg-red-50 text-red-600', icon: XCircle, dot: 'bg-red-500' },
  paused:    { color: 'bg-amber-50 text-amber-600', icon: AlertTriangle, dot: 'bg-amber-500' },
};

function StatCard({ label, value, icon: Icon, color, iconColor }) { // eslint-disable-line react/prop-types
  return (
    <div className="bg-white rounded-2xl border border-zinc-200/60 p-5 hover:shadow-md hover:shadow-zinc-100 transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function ExecutionRow({ exec }) { // eslint-disable-line react/prop-types
  const config = STATUS_CONFIG[exec.status] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;
  const logs = Array.isArray(exec.logs) ? exec.logs : [];
  const workflowName = exec.workflows?.name || 'Unknown Workflow';
  const leadName = exec.leads?.name || 'Unknown Lead';
  const leadEmail = exec.leads?.email || '';
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden hover:shadow-md hover:shadow-zinc-100 transition-all">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        <div className={`w-2.5 h-2.5 rounded-full ${config.dot} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-zinc-900 truncate">{workflowName}</span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
            <span className="text-sm text-zinc-600 truncate">{leadName}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            {leadEmail && <span>{leadEmail}</span>}
            {exec.started_at && (
              <span>{new Date(exec.started_at).toLocaleString()}</span>
            )}
            {!exec.started_at && exec.created_at && (
              <span>{new Date(exec.created_at).toLocaleString()}</span>
            )}
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${config.color}`}>
          <StatusIcon className={`w-3.5 h-3.5 ${exec.status === 'running' ? 'animate-spin' : ''}`} />
          {exec.status}
        </span>
        <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-zinc-100">
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-zinc-400">Current Node</span>
              <p className="text-zinc-700 font-medium mt-0.5">{exec.current_node || '—'}</p>
            </div>
            <div>
              <span className="text-zinc-400">Started</span>
              <p className="text-zinc-700 font-medium mt-0.5">
                {exec.started_at ? new Date(exec.started_at).toLocaleString() : '—'}
              </p>
            </div>
            <div>
              <span className="text-zinc-400">Completed</span>
              <p className="text-zinc-700 font-medium mt-0.5">
                {exec.completed_at ? new Date(exec.completed_at).toLocaleString() : '—'}
              </p>
            </div>
            <div>
              <span className="text-zinc-400">Duration</span>
              <p className="text-zinc-700 font-medium mt-0.5">
                {exec.started_at && exec.completed_at
                  ? `${((new Date(exec.completed_at) - new Date(exec.started_at)) / 1000).toFixed(1)}s`
                  : '—'}
              </p>
            </div>
          </div>

          {logs.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-zinc-400 mb-2">Execution Log</p>
              <div className="bg-zinc-900 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1 font-mono text-xs">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-zinc-500 flex-shrink-0">
                      {log.time ? new Date(log.time).toLocaleTimeString() : `#${i + 1}`}
                    </span>
                    <span className={
                      log.level === 'error' ? 'text-red-400'
                      : log.level === 'warn' ? 'text-amber-400'
                      : 'text-emerald-400'
                    }>
                      {log.message || JSON.stringify(log)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {logs.length === 0 && (
            <div className="mt-4 p-3 bg-zinc-50 rounded-lg text-xs text-zinc-400 text-center">
              No execution logs available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Executions() {
  const [executions, setExecutions] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadData = useCallback(async () => {
    try {
      const [execs, wfs] = await Promise.all([fetchExecutions(), fetchWorkflows()]);
      setExecutions(execs || []);
      setWorkflows(wfs || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [loadData]);

  const filtered = filter === 'all'
    ? executions
    : executions.filter(e => e.status === filter);

  const counts = {
    total: executions.length,
    completed: executions.filter(e => e.status === 'completed').length,
    failed: executions.filter(e => e.status === 'failed').length,
    running: executions.filter(e => e.status === 'running').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Play className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">Executions</h2>
            <p className="text-sm text-zinc-500">Monitor live and past workflow executions</p>
          </div>
        </div>
        <button
          onClick={() => { setLoading(true); loadData(); }}
          className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:text-zinc-800 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Runs" value={counts.total} icon={Zap} color="bg-indigo-50" iconColor="text-indigo-600" />
        <StatCard label="Completed" value={counts.completed} icon={CheckCircle2} color="bg-emerald-50" iconColor="text-emerald-600" />
        <StatCard label="Failed" value={counts.failed} icon={XCircle} color="bg-red-50" iconColor="text-red-600" />
        <StatCard label="Running" value={counts.running} icon={Loader2} color="bg-blue-50" iconColor="text-blue-600" />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-zinc-100/80 p-1 rounded-xl w-fit">
        {[
          { id: 'all', label: 'All' },
          { id: 'running', label: 'Running' },
          { id: 'completed', label: 'Completed' },
          { id: 'failed', label: 'Failed' },
          { id: 'pending', label: 'Pending' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              filter === tab.id
                ? 'bg-white text-zinc-900 shadow-sm shadow-zinc-200/50'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab.label}
            {tab.id !== 'all' && (
              <span className="ml-1.5 text-xs opacity-60">
                {executions.filter(e => e.status === tab.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Executions List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-zinc-200/60 p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
                <div className="flex-1">
                  <div className="h-4 bg-zinc-200 rounded w-48 mb-2" />
                  <div className="h-3 bg-zinc-100 rounded w-32" />
                </div>
                <div className="h-6 bg-zinc-200 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200/60 p-16 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-zinc-100 to-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Play className="w-7 h-7 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-700 mb-2">No executions yet</h3>
          <p className="text-sm text-zinc-400 max-w-sm mx-auto">
            {filter === 'all'
              ? 'Workflow executions will appear here once you run a workflow on your leads.'
              : `No ${filter} executions found. Try a different filter.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(exec => (
            <ExecutionRow key={exec.id} exec={exec} />
          ))}
        </div>
      )}

      {/* Available Workflows Quick Reference */}
      {workflows.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200/60 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-zinc-900">Available Workflows</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {workflows.map(wf => (
              <div key={wf.id} className="flex items-center gap-3 p-3 bg-zinc-50/80 rounded-xl border border-zinc-100">
                <div className={`w-2 h-2 rounded-full ${wf.is_active ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{wf.name}</p>
                  <p className="text-xs text-zinc-400">
                    {Array.isArray(wf.nodes) ? wf.nodes.length : 0} nodes
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
