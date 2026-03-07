import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  ChevronRight, Zap, Bot, ArrowRight, Loader2, Search,
  Users, Check, X, Radio, Activity
} from 'lucide-react';
import { fetchWorkflows, fetchLeads, runWorkflowExecution, fetchExecutionsFromAPI } from '../lib/supabaseService';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import PropTypes from 'prop-types';

const STATUS_CONFIG = {
  pending:   { color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400', icon: Clock, dot: 'bg-zinc-400' },
  running:   { color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', icon: Loader2, dot: 'bg-blue-500' },
  completed: { color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400', icon: CheckCircle2, dot: 'bg-emerald-500' },
  failed:    { color: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400', icon: XCircle, dot: 'bg-red-500' },
  paused:    { color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400', icon: AlertTriangle, dot: 'bg-amber-500' },
};

function getLogColor(level) {
  if (level === 'error') return 'text-red-400';
  if (level === 'warn') return 'text-amber-400';
  return 'text-emerald-400';
}

function getLeadStatusBadge(status) {
  if (status === 'new') return 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
  if (status === 'contacted') return 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
  if (status === 'converted') return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
  return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400';
}

function StatCard({ label, value, icon: Icon, color, iconColor }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 p-5 hover:shadow-md hover:shadow-zinc-100 dark:shadow-zinc-900/30 transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">{label}</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.string.isRequired,
  iconColor: PropTypes.string.isRequired,
};

function ExecutionRow({ exec }) {
  const config = STATUS_CONFIG[exec.status] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;
  const logs = Array.isArray(exec.logs) ? exec.logs : [];
  const workflowName = exec.workflows?.name || 'Unknown Workflow';
  const leadName = exec.leads?.name || 'Unknown Lead';
  const leadEmail = exec.leads?.email || '';
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 overflow-hidden hover:shadow-md hover:shadow-zinc-100 dark:shadow-zinc-900/30 transition-all">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        <div className={`w-2.5 h-2.5 rounded-full ${config.dot} flex-shrink-0 ${exec.status === 'running' ? 'animate-pulse' : ''}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{workflowName}</span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{leadName}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            {leadEmail && <span>{leadEmail}</span>}
            {exec.started_at && <span>{new Date(exec.started_at).toLocaleString()}</span>}
            {!exec.started_at && exec.created_at && <span>{new Date(exec.created_at).toLocaleString()}</span>}
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${config.color}`}>
          <StatusIcon className={`w-3.5 h-3.5 ${exec.status === 'running' ? 'animate-spin' : ''}`} />
          {exec.status}
        </span>
        <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-zinc-400">Current Node</span>
              <p className="text-zinc-700 dark:text-zinc-300 font-medium mt-0.5">{exec.current_node || '—'}</p>
            </div>
            <div>
              <span className="text-zinc-400">Started</span>
              <p className="text-zinc-700 dark:text-zinc-300 font-medium mt-0.5">
                {exec.started_at ? new Date(exec.started_at).toLocaleString() : '—'}
              </p>
            </div>
            <div>
              <span className="text-zinc-400">Completed</span>
              <p className="text-zinc-700 dark:text-zinc-300 font-medium mt-0.5">
                {exec.completed_at ? new Date(exec.completed_at).toLocaleString() : '—'}
              </p>
            </div>
            <div>
              <span className="text-zinc-400">Duration</span>
              <p className="text-zinc-700 dark:text-zinc-300 font-medium mt-0.5">
                {(() => {
                  if (exec.started_at && exec.completed_at) return `${((new Date(exec.completed_at) - new Date(exec.started_at)) / 1000).toFixed(1)}s`;
                  if (exec.status === 'running') return 'In progress...';
                  return '—';
                })()}
              </p>
            </div>
          </div>

          {logs.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-zinc-400 mb-2">Execution Log ({logs.length} entries)</p>
              <div className="bg-zinc-900 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1 font-mono text-xs">
                {logs.map((log, i) => {
                  const logColor = getLogColor(log.level);
                  return (
                    <div key={`${log.time || ''}-${i}`} className="flex gap-2">
                      <span className="text-zinc-500 dark:text-zinc-400 flex-shrink-0">
                        {log.time ? new Date(log.time).toLocaleTimeString() : `#${i + 1}`}
                      </span>
                      <span className={logColor}>
                        {log.message || JSON.stringify(log)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {logs.length === 0 && (
            <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-xs text-zinc-400 text-center">
              No execution logs available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

ExecutionRow.propTypes = {
  exec: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    status: PropTypes.string,
    logs: PropTypes.array,
    workflows: PropTypes.shape({ name: PropTypes.string }),
    leads: PropTypes.shape({ name: PropTypes.string, email: PropTypes.string }),
    started_at: PropTypes.string,
    created_at: PropTypes.string,
    completed_at: PropTypes.string,
    current_node: PropTypes.string,
  }).isRequired,
};

export default function Executions() {
  const [executions, setExecutions] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('history');
  const [liveLogs, setLiveLogs] = useState([]);
  const socketRef = useRef(null);

  const [error, setError] = useState(null);

  // Run modal state
  const [showRunModal, setShowRunModal] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [allLeads, setAllLeads] = useState([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [runningExecution, setRunningExecution] = useState(false);

  // Socket.io for real-time
  const [socketConnected, setSocketConnected] = useState(true);

  const loadDataRef = useRef(null);

  const updateExecutionStatus = useCallback((data) => {
    setExecutions(prev => prev.map(e =>
      e.id === data.executionId
        ? { ...e, status: data.status, current_node: data.currentNode }
        : e
    ));
    if (data.status === 'completed' || data.status === 'failed') {
      setTimeout(() => { if (loadDataRef.current) loadDataRef.current(); }, 1000);
    }
  }, []);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || window.location.origin);
    socketRef.current = socket;

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('connect_error', () => setSocketConnected(false));

    socket.on('execution:log', (data) => {
      setLiveLogs(prev => [...prev, { ...data.log, executionId: data.executionId }].slice(-200));
    });

    socket.on('execution:status', updateExecutionStatus);

    return () => { socket.disconnect(); };
  }, [updateExecutionStatus]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [execs, wfs] = await Promise.all([
        fetchExecutionsFromAPI({ status: filter }),
        fetchWorkflows(),
      ]);
      setExecutions(execs || []);
      setWorkflows(wfs || []);
    } catch (err) {
      setError(err.message || 'Failed to load executions');
      toast.error(err.message || 'Failed to load executions');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadDataRef.current = loadData; }, [loadData]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [loadData]);

  const openRunModal = async () => {
    setShowRunModal(true);
    setLoadingLeads(true);
    try {
      const result = await fetchLeads({ limit: 200 });
      setAllLeads(result.leads || []);
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setLoadingLeads(false);
    }
  };

  const toggleLead = (id) => {
    setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleRun = async () => {
    if (!selectedWorkflowId) { toast.error('Select a workflow'); return; }
    if (selectedLeadIds.length === 0) { toast.error('Select at least one lead'); return; }

    setRunningExecution(true);
    try {
      const result = await runWorkflowExecution({ workflowId: selectedWorkflowId, leadIds: selectedLeadIds });
      toast.success(`Started ${result.executionIds.length} execution(s)!`);
      setShowRunModal(false);
      setSelectedLeadIds([]);
      setSelectedWorkflowId('');
      setTab('live');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to run workflow');
    } finally {
      setRunningExecution(false);
    }
  };

  const filtered = filter === 'all' ? executions : executions.filter(e => e.status === filter);
  const counts = {
    total: executions.length,
    completed: executions.filter(e => e.status === 'completed').length,
    failed: executions.filter(e => e.status === 'failed').length,
    running: executions.filter(e => e.status === 'running').length,
  };
  const filteredLeads = allLeads.filter(l =>
    l.name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
    l.email?.toLowerCase().includes(leadSearch.toLowerCase()) ||
    l.company?.toLowerCase().includes(leadSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Offline Banner */}
      {!socketConnected && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Disconnected — reconnecting... <button onClick={() => socketRef.current?.connect()} className="underline font-medium">Retry now</button></span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => { setLoading(true); loadData(); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 rounded-lg transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Play className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Executions</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Run workflows and monitor execution progress</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setLoading(true); loadData(); }} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={openRunModal} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 shadow-sm transition-all">
            <Zap className="w-4 h-4" />
            Run Workflow
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Runs" value={counts.total} icon={Zap} color="bg-indigo-50 dark:bg-indigo-900/30" iconColor="text-indigo-600 dark:text-indigo-400" />
        <StatCard label="Completed" value={counts.completed} icon={CheckCircle2} color="bg-emerald-50 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Failed" value={counts.failed} icon={XCircle} color="bg-red-50 dark:bg-red-900/30" iconColor="text-red-600 dark:text-red-400" />
        <StatCard label="Running" value={counts.running} icon={Loader2} color="bg-blue-50 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400" />
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-zinc-100/80 dark:bg-zinc-800/80 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('live')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${tab === 'live' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm shadow-zinc-200/50' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300'}`}>
          <Radio className={`w-3.5 h-3.5 ${tab === 'live' && liveLogs.length > 0 ? 'text-emerald-500 animate-pulse' : ''}`} />
          Live Feed
          {liveLogs.length > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
        </button>
        <button onClick={() => setTab('history')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${tab === 'history' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm shadow-zinc-200/50' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300'}`}>
          <Activity className="w-3.5 h-3.5" />
          History
        </button>
      </div>

      {/* Live Feed */}
      {tab === 'live' && (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-zinc-300">Live Execution Feed</span>
            </div>
            <button onClick={() => setLiveLogs([])} className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-400 transition-colors">Clear</button>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto font-mono text-xs space-y-0.5">
            {liveLogs.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 dark:text-zinc-400">
                <Radio className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p>Waiting for execution events...</p>
                <p className="text-zinc-700 dark:text-zinc-300 mt-1">Run a workflow to see real-time logs here</p>
              </div>
            ) : (
              liveLogs.map((log, i) => {
                const logColor = getLogColor(log.level);
                return (
                  <div key={`live-${log.time || ''}-${i}`} className="flex gap-3">
                    <span className="text-zinc-600 dark:text-zinc-400 flex-shrink-0 w-20">{log.time ? new Date(log.time).toLocaleTimeString() : ''}</span>
                    <span className="text-zinc-500 dark:text-zinc-400 flex-shrink-0 w-16">#{log.executionId}</span>
                    <span className={logColor}>{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <>
          <div className="flex gap-1 bg-zinc-100/80 dark:bg-zinc-800/80 p-1 rounded-xl w-fit">
            {['all', 'running', 'completed', 'failed', 'pending'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 capitalize ${filter === f ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm shadow-zinc-200/50' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300'}`}>
                {f}
                {f !== 'all' && <span className="ml-1.5 text-xs opacity-60">{executions.filter(e => e.status === f).length}</span>}
              </button>
            ))}
          </div>

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 p-5 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
                    <div className="flex-1"><div className="h-4 bg-zinc-200 rounded w-48 mb-2" /><div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-32" /></div>
                    <div className="h-6 bg-zinc-200 rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <div className="space-y-3">{filtered.map(exec => <ExecutionRow key={exec.id} exec={exec} />)}</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 p-16 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-zinc-100 to-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Play className="w-7 h-7 text-zinc-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">No executions yet</h3>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto mb-4">
                {filter === 'all' ? 'Click "Run Workflow" to get started.' : `No ${filter} executions found.`}
              </p>
              <button onClick={openRunModal} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all">
                <Zap className="w-4 h-4" />
                Run Your First Workflow
              </button>
            </div>
          )}
        </>
      )}

      {/* Available Workflows */}
      {workflows.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Available Workflows</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {workflows.map(wf => (
              <div key={wf.id} className="flex items-center gap-3 p-3 bg-zinc-50/80 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div className={`w-2 h-2 rounded-full ${wf.is_active ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                <div className="min-w-0"><p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{wf.name}</p><p className="text-xs text-zinc-400">{Array.isArray(wf.nodes) ? wf.nodes.length : 0} nodes</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Run Modal */}
      {showRunModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Run Workflow</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Select a workflow and leads to execute</p>
                </div>
              </div>
              <button onClick={() => { setShowRunModal(false); setSelectedLeadIds([]); }} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
              </button>
            </div>

            <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <label htmlFor="workflow-select" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Workflow</label>
              <select id="workflow-select" value={selectedWorkflowId} onChange={(e) => setSelectedWorkflowId(e.target.value)} className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none">
                <option value="">Select a workflow...</option>
                {workflows.map(wf => <option key={wf.id} value={wf.id}>{wf.name} ({Array.isArray(wf.nodes) ? wf.nodes.length : 0} nodes)</option>)}
              </select>
            </div>

            <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input type="text" value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} placeholder="Search leads..." className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                </div>
                <button onClick={() => setSelectedLeadIds(filteredLeads.map(l => l.id))} className="px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:bg-emerald-900/30 rounded-lg transition-colors">All</button>
                <button onClick={() => setSelectedLeadIds([])} className="px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">Clear</button>
              </div>
              {selectedLeadIds.length > 0 && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">{selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected</p>}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1.5">
              {loadingLeads && (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>
              )}
              {!loadingLeads && filteredLeads.length === 0 && (
                <div className="text-center py-12"><Users className="w-10 h-10 text-zinc-300 mx-auto mb-2" /><p className="text-sm text-zinc-500 dark:text-zinc-400">No leads found</p></div>
              )}
              {!loadingLeads && filteredLeads.length > 0 && (
                filteredLeads.map(lead => (
                  <button key={lead.id} onClick={() => toggleLead(lead.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedLeadIds.includes(lead.id) ? 'border-emerald-300 bg-emerald-50/50 ring-1 ring-emerald-200' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selectedLeadIds.includes(lead.id) ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-300 dark:border-zinc-600'}`}>
                      {selectedLeadIds.includes(lead.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{lead.name}</p>
                      <p className="text-xs text-zinc-400 truncate">{lead.email} {lead.company ? `· ${lead.company}` : ''}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getLeadStatusBadge(lead.status)}`}>{lead.status}</span>
                  </button>
                ))
              )}
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <p className="text-xs text-zinc-400">{selectedWorkflowId ? workflows.find(w => String(w.id) === String(selectedWorkflowId))?.name : 'No workflow selected'}</p>
              <div className="flex gap-2">
                <button onClick={() => { setShowRunModal(false); setSelectedLeadIds([]); }} className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">Cancel</button>
                <button onClick={handleRun} disabled={runningExecution || !selectedWorkflowId || selectedLeadIds.length === 0} className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm">
                  {runningExecution ? <><Loader2 className="w-4 h-4 animate-spin" /> Running...</> : <><Zap className="w-4 h-4" /> Execute on {selectedLeadIds.length} Lead{selectedLeadIds.length > 1 ? 's' : ''}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
