import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  GitBranch, Plus, Trash2, Copy,
  Sparkles, Calendar, Download, AlertCircle,
  RefreshCw, Power, Loader2
} from 'lucide-react';
import {
  fetchWorkflows as fetchWorkflowsFromDB,
  seedWorkflowTemplates,
  deleteWorkflow as deleteWorkflowFromDB,
  createWorkflow,
  toggleWorkflowActive,
} from '../lib/supabaseService';

export default function Workflows() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const fetchWorkflows = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWorkflowsFromDB();
      setWorkflows(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load workflows');
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkflows(); }, []);

  const seedTemplates = async () => {
    setSeeding(true);
    try {
      const result = await seedWorkflowTemplates();
      toast.success(result.message || 'Templates loaded!');
      fetchWorkflows();
    } catch (err) {
      toast.error(err.message || 'Failed to seed templates');
    } finally {
      setSeeding(false);
    }
  };

  const deleteWorkflow = async (id) => {
    try {
      await deleteWorkflowFromDB(id);
      toast.success('Workflow deleted');
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      toast.error(err.message || 'Failed to delete workflow');
    }
  };

  const duplicateWorkflow = async (wf) => {
    try {
      const created = await createWorkflow({
        name: `${wf.name} (Copy)`,
        description: wf.description,
        nodes: wf.nodes,
        edges: wf.edges,
      });
      toast.success('Workflow duplicated');
      setWorkflows((prev) => [created, ...prev]);
    } catch (err) {
      toast.error(err.message || 'Failed to duplicate');
    }
  };

  const handleToggleActive = async (e, wf) => {
    e.stopPropagation();
    setTogglingId(wf.id);
    try {
      const updated = await toggleWorkflowActive(wf.id, !wf.is_active);
      setWorkflows((prev) =>
        prev.map((w) => (w.id === wf.id ? { ...w, is_active: updated.is_active } : w))
      );
      toast.success(updated.is_active ? 'Workflow activated' : 'Workflow deactivated');
    } catch (err) {
      toast.error(err.message || 'Failed to toggle workflow');
    } finally {
      setTogglingId(null);
    }
  };

  const nodeCount = (wf) => (wf.nodes || []).length;
  const edgeCount = (wf) => (wf.edges || []).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Workflows</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Build and manage your outreach automation workflows</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchWorkflows}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={seedTemplates}
            disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {seeding ? 'Loading...' : 'Load Templates'}
          </button>
          <button
            onClick={() => navigate('/workflows/new')}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            New Workflow
          </button>
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
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Failed to load workflows</h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
              <button
                onClick={fetchWorkflows}
                className="mt-3 flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 animate-pulse">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-200" />
                <div className="h-4 bg-zinc-200 rounded w-2/3" />
              </div>
              <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-full mb-2" />
              <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-4/5 mb-4" />
              <div className="flex gap-3">
                <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-16" />
                <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-16" />
                <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-20 ml-auto" />
              </div>
              <div className="mt-3 h-5 bg-zinc-100 dark:bg-zinc-800 rounded-full w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && workflows.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GitBranch className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">No workflows yet</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 max-w-sm mx-auto">
            Create a new workflow from scratch or load pre-built templates to get started.
          </p>
          <div className="flex items-center gap-2 justify-center">
            <button
              onClick={seedTemplates}
              disabled={seeding}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:bg-indigo-900/30 transition-colors disabled:opacity-50"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {seeding ? 'Loading...' : 'Load Templates'}
            </button>
            <button
              onClick={() => navigate('/workflows/new')}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Workflow
            </button>
          </div>
        </div>
      )}

      {/* Workflow Cards */}
      {!loading && !error && workflows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((wf) => (
            <button
              key={wf.id}
              type="button"
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 hover:shadow-lg hover:border-indigo-200 dark:border-indigo-800 transition-all group cursor-pointer text-left w-full"
              onClick={() => navigate(`/workflows/${wf.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                    <GitBranch className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{wf.name}</h3>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleActive(e, wf); }}
                    disabled={togglingId === wf.id}
                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-50"
                    title={wf.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {togglingId === wf.id
                      ? <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin" />
                      : <Power className={`w-3.5 h-3.5 ${wf.is_active ? 'text-emerald-500' : 'text-zinc-400'}`} />
                    }
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); duplicateWorkflow(wf); }}
                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteWorkflow(wf.id); }}
                    className="p-1.5 hover:bg-red-50 dark:bg-red-900/30 rounded-md transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>

              {wf.description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 line-clamp-2">{wf.description}</p>
              )}

              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> {nodeCount(wf)} nodes
                </span>
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3 h-3" /> {edgeCount(wf)} edges
                </span>
                <span className="flex items-center gap-1 ml-auto">
                  <Calendar className="w-3 h-3" />
                  {new Date(wf.updated_at || wf.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className={`mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${wf.is_active ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${wf.is_active ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                {wf.is_active ? 'Active' : 'Inactive'}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
