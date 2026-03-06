import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  fetchWorkflowById,
  createWorkflow,
  updateWorkflow as updateWorkflowInDB,
  fetchLeads,
  runWorkflowExecution,
} from '../lib/supabaseService';
import {
  Save, ArrowLeft, Play, Sparkles, Mail, Clock,
  GitBranch, UserCheck, Square, GripVertical, Trash2,
  Globe, Webhook, Bot, Code, Filter, Merge, Split,
  CalendarClock, FileText, Tags, MessageSquare, Smartphone,
  ChevronDown, ChevronRight, Search, Zap, X, Check, Users, Loader2
} from 'lucide-react';

import StartNode from '../components/nodes/StartNode';
import AIGenerateNode from '../components/nodes/AIGenerateNode';
import EmailNode from '../components/nodes/EmailNode';
import DelayNode from '../components/nodes/DelayNode';
import ConditionNode from '../components/nodes/ConditionNode';
import UpdateLeadNode from '../components/nodes/UpdateLeadNode';
import EndNode from '../components/nodes/EndNode';
import HttpRequestNode from '../components/nodes/HttpRequestNode';
import WebhookNode from '../components/nodes/WebhookNode';
import AIAgentNode from '../components/nodes/AIAgentNode';
import CodeNode from '../components/nodes/CodeNode';
import FilterNode from '../components/nodes/FilterNode';
import MergeNode from '../components/nodes/MergeNode';
import SplitNode from '../components/nodes/SplitNode';
import ScheduleNode from '../components/nodes/ScheduleNode';
import SummarizerNode from '../components/nodes/SummarizerNode';
import ClassifierNode from '../components/nodes/ClassifierNode';
import SlackNode from '../components/nodes/SlackNode';
import SmsNode from '../components/nodes/SmsNode';
import NodeConfigPanel from '../components/NodeConfigPanel';

const nodeTypes = {
  startNode: StartNode,
  aiGenerateNode: AIGenerateNode,
  emailNode: EmailNode,
  delayNode: DelayNode,
  conditionNode: ConditionNode,
  updateLeadNode: UpdateLeadNode,
  endNode: EndNode,
  httpRequestNode: HttpRequestNode,
  webhookNode: WebhookNode,
  aiAgentNode: AIAgentNode,
  codeNode: CodeNode,
  filterNode: FilterNode,
  mergeNode: MergeNode,
  splitNode: SplitNode,
  scheduleNode: ScheduleNode,
  summarizerNode: SummarizerNode,
  classifierNode: ClassifierNode,
  slackNode: SlackNode,
  smsNode: SmsNode,
};

const paletteCategories = [
  {
    name: 'Triggers',
    items: [
      { type: 'startNode', label: 'Start', icon: Play, bgClass: 'bg-emerald-500', hoverBorder: 'hover:border-emerald-300', hoverBg: 'hover:bg-emerald-50/50', description: 'Manual workflow trigger' },
      { type: 'webhookNode', label: 'Webhook', icon: Webhook, bgClass: 'bg-pink-500', hoverBorder: 'hover:border-pink-300', hoverBg: 'hover:bg-pink-50/50', description: 'HTTP webhook trigger' },
      { type: 'scheduleNode', label: 'Schedule', icon: CalendarClock, bgClass: 'bg-cyan-500', hoverBorder: 'hover:border-cyan-300', hoverBg: 'hover:bg-cyan-50/50', description: 'Cron / interval trigger' },
    ],
  },
  {
    name: 'AI & ML',
    items: [
      { type: 'aiAgentNode', label: 'AI Agent', icon: Bot, bgClass: 'bg-purple-500', hoverBorder: 'hover:border-purple-300', hoverBg: 'hover:bg-purple-50/50', description: 'Multi-model AI agent' },
      { type: 'aiGenerateNode', label: 'AI Generate', icon: Sparkles, bgClass: 'bg-violet-500', hoverBorder: 'hover:border-violet-300', hoverBg: 'hover:bg-violet-50/50', description: 'Generate AI content' },
      { type: 'summarizerNode', label: 'Summarizer', icon: FileText, bgClass: 'bg-rose-500', hoverBorder: 'hover:border-rose-300', hoverBg: 'hover:bg-rose-50/50', description: 'AI summarization' },
      { type: 'classifierNode', label: 'Classifier', icon: Tags, bgClass: 'bg-yellow-500', hoverBorder: 'hover:border-yellow-300', hoverBg: 'hover:bg-yellow-50/50', description: 'AI classification' },
    ],
  },
  {
    name: 'Communication',
    items: [
      { type: 'emailNode', label: 'Email', icon: Mail, bgClass: 'bg-blue-500', hoverBorder: 'hover:border-blue-300', hoverBg: 'hover:bg-blue-50/50', description: 'Send email' },
      { type: 'slackNode', label: 'Slack', icon: MessageSquare, bgClass: 'bg-green-600', hoverBorder: 'hover:border-green-300', hoverBg: 'hover:bg-green-50/50', description: 'Slack message' },
      { type: 'smsNode', label: 'SMS', icon: Smartphone, bgClass: 'bg-violet-600', hoverBorder: 'hover:border-violet-300', hoverBg: 'hover:bg-violet-50/50', description: 'Send SMS' },
    ],
  },
  {
    name: 'Logic & Flow',
    items: [
      { type: 'conditionNode', label: 'Condition', icon: GitBranch, bgClass: 'bg-orange-500', hoverBorder: 'hover:border-orange-300', hoverBg: 'hover:bg-orange-50/50', description: 'Branch by condition' },
      { type: 'filterNode', label: 'Filter', icon: Filter, bgClass: 'bg-indigo-500', hoverBorder: 'hover:border-indigo-300', hoverBg: 'hover:bg-indigo-50/50', description: 'Filter data' },
      { type: 'delayNode', label: 'Delay', icon: Clock, bgClass: 'bg-amber-500', hoverBorder: 'hover:border-amber-300', hoverBg: 'hover:bg-amber-50/50', description: 'Wait / pause' },
      { type: 'mergeNode', label: 'Merge', icon: Merge, bgClass: 'bg-lime-500', hoverBorder: 'hover:border-lime-300', hoverBg: 'hover:bg-lime-50/50', description: 'Combine branches' },
      { type: 'splitNode', label: 'Split', icon: Split, bgClass: 'bg-fuchsia-500', hoverBorder: 'hover:border-fuchsia-300', hoverBg: 'hover:bg-fuchsia-50/50', description: 'A/B split' },
    ],
  },
  {
    name: 'Integrations',
    items: [
      { type: 'httpRequestNode', label: 'HTTP Request', icon: Globe, bgClass: 'bg-sky-500', hoverBorder: 'hover:border-sky-300', hoverBg: 'hover:bg-sky-50/50', description: 'Call external API' },
      { type: 'codeNode', label: 'Code', icon: Code, bgClass: 'bg-zinc-700', hoverBorder: 'hover:border-zinc-400', hoverBg: 'hover:bg-zinc-50/50', description: 'Custom JS/Python' },
      { type: 'updateLeadNode', label: 'Update Lead', icon: UserCheck, bgClass: 'bg-teal-500', hoverBorder: 'hover:border-teal-300', hoverBg: 'hover:bg-teal-50/50', description: 'Change lead status' },
    ],
  },
  {
    name: 'Flow',
    items: [
      { type: 'endNode', label: 'End', icon: Square, bgClass: 'bg-red-500', hoverBorder: 'hover:border-red-300', hoverBg: 'hover:bg-red-50/50', description: 'End workflow' },
    ],
  },
];

const defaultNodeData = {
  startNode: { label: 'Start', trigger: 'manual' },
  aiGenerateNode: { label: 'AI Generate', prompt: '', tone: 'professional', maxLength: 200 },
  emailNode: { label: 'Send Email', subject: '', fromName: 'FlowReach AI' },
  delayNode: { label: 'Delay', duration: 1, unit: 'days' },
  conditionNode: { label: 'Condition', field: 'status', operator: 'equals', value: 'replied' },
  updateLeadNode: { label: 'Update Lead', status: 'contacted' },
  endNode: { label: 'End' },
  httpRequestNode: { label: 'HTTP Request', method: 'GET', url: '', headers: '{}', body: '' },
  webhookNode: { label: 'Webhook', path: '', httpMethod: 'POST', responseMessage: 'OK' },
  aiAgentNode: { label: 'AI Agent', provider: 'groq', model: 'llama-3.3-70b-versatile', systemPrompt: '', userPrompt: '', temperature: 0.7, maxTokens: 1024 },
  codeNode: { label: 'Code', language: 'javascript', code: '' },
  filterNode: { label: 'Filter', filterField: 'status', filterOp: 'equals', filterValue: '' },
  mergeNode: { label: 'Merge', mode: 'append' },
  splitNode: { label: 'Split', splitMode: 'round_robin', percentage: 50 },
  scheduleNode: { label: 'Schedule', interval: 'daily', time: '09:00', cron: '' },
  summarizerNode: { label: 'Summarizer', style: 'bullets', outputLength: 100 },
  classifierNode: { label: 'Classifier', categories: ['hot_lead', 'warm_lead', 'cold_lead'], classifyPrompt: '' },
  slackNode: { label: 'Slack', channel: 'general', message: '' },
  smsNode: { label: 'SMS', to: '', smsMessage: '' },
};

let nodeId = 0;
const getNodeId = () => `node-${Date.now()}-${++nodeId}`;

export default function WorkflowBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [workflowDesc, setWorkflowDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [executeLeads, setExecuteLeads] = useState([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [executing, setExecuting] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Load workflow if editing
  useEffect(() => {
    if (id && id !== 'new') {
      fetchWorkflowById(id)
        .then(wf => {
          setWorkflowName(wf.name);
          setWorkflowDesc(wf.description || '');
          setNodes(wf.nodes || []);
          setEdges(wf.edges || []);
        })
        .catch(() => toast.error('Failed to load workflow'));
    }
  }, [id, setNodes, setEdges]);

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({
      ...params,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
      style: { stroke: '#6366f1', strokeWidth: 2 },
      animated: true,
    }, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type || !reactFlowInstance) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const newNode = {
      id: getNodeId(),
      type,
      position,
      data: { ...defaultNodeData[type] },
    };

    setNodes((nds) => nds.concat(newNode));
  }, [reactFlowInstance, setNodes]);

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((n) => n.id === nodeId ? { ...n, data: newData } : n)
    );
    setSelectedNode((prev) => prev && prev.id === nodeId ? { ...prev, data: newData } : prev);
  }, [setNodes]);

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  const openExecuteModal = async () => {
    setShowExecuteModal(true);
    setLoadingLeads(true);
    try {
      const result = await fetchLeads({ limit: 200 });
      setExecuteLeads(result.leads || []);
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setLoadingLeads(false);
    }
  };

  const toggleLeadSelection = (leadId) => {
    setSelectedLeadIds(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const selectAllLeads = () => {
    const filteredLeadsList = executeLeads.filter(l =>
      l.name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.email?.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.company?.toLowerCase().includes(leadSearch.toLowerCase())
    );
    setSelectedLeadIds(filteredLeadsList.map(l => l.id));
  };

  const handleExecute = async () => {
    if (selectedLeadIds.length === 0) {
      toast.error('Select at least one lead');
      return;
    }
    if (!id || id === 'new') {
      toast.error('Save the workflow first before executing');
      return;
    }

    setExecuting(true);
    try {
      const result = await runWorkflowExecution({ workflowId: id, leadIds: selectedLeadIds });
      toast.success(`Started ${result.executionIds.length} execution(s)!`);
      setShowExecuteModal(false);
      setSelectedLeadIds([]);
    } catch (err) {
      toast.error(err.message || 'Failed to execute');
    } finally {
      setExecuting(false);
    }
  };

  const saveWorkflow = async () => {
    if (!workflowName.trim()) {
      toast.error('Workflow name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: workflowName,
        description: workflowDesc,
        nodes,
        edges,
      };

      if (id && id !== 'new') {
        await updateWorkflowInDB(id, payload);
        toast.success('Workflow saved!');
      } else {
        const created = await createWorkflow(payload);
        toast.success('Workflow created!');
        navigate(`/workflows/${created.id}`, { replace: true });
      }
    } catch (err) {
      toast.error('Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/workflows')}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-600" />
          </button>
          <div>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="text-lg font-semibold text-zinc-900 bg-transparent border-none outline-none focus:ring-0 p-0"
              placeholder="Workflow name..."
            />
            <input
              type="text"
              value={workflowDesc}
              onChange={(e) => setWorkflowDesc(e.target.value)}
              className="block text-xs text-zinc-500 bg-transparent border-none outline-none focus:ring-0 p-0 w-64"
              placeholder="Add a description..."
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={deleteSelectedNode}
            disabled={!selectedNode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-zinc-200 text-zinc-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
          <button
            onClick={openExecuteModal}
            disabled={!id || id === 'new' || nodes.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            Execute
          </button>
          <button
            onClick={saveWorkflow}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-sm disabled:opacity-60 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Node Palette */}
        <NodePalette onDragStart={onDragStart} />

        {/* React Flow Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            defaultEdgeOptions={{
              markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
              style: { stroke: '#6366f1', strokeWidth: 2 },
              animated: true,
            }}
            className="bg-zinc-50"
          >
            <Controls className="!bg-white !border-zinc-200 !shadow-lg !rounded-lg" />
            <MiniMap
              className="!bg-white !border-zinc-200 !shadow-lg !rounded-lg"
              nodeColor={(n) => {
                const colors = {
                  startNode: '#10b981', aiGenerateNode: '#8b5cf6', emailNode: '#3b82f6',
                  delayNode: '#f59e0b', conditionNode: '#f97316', updateLeadNode: '#14b8a6',
                  endNode: '#ef4444', httpRequestNode: '#0ea5e9', webhookNode: '#ec4899',
                  aiAgentNode: '#a855f7', codeNode: '#3f3f46', filterNode: '#6366f1',
                  mergeNode: '#84cc16', splitNode: '#d946ef', scheduleNode: '#06b6d4',
                  summarizerNode: '#f43f5e', classifierNode: '#eab308', slackNode: '#16a34a',
                  smsNode: '#7c3aed',
                };
                return colors[n.type] || '#64748b';
              }}
            />
            <Background variant="dots" gap={20} size={1} color="#d4d4d8" />
            {nodes.length === 0 && (
              <Panel position="top-center" className="!mt-24">
                <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-xl border border-zinc-200 shadow-lg">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <GitBranch className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900">Build Your Workflow</h3>
                  <p className="text-sm text-zinc-500 mt-1 max-w-xs">
                    Drag nodes from the palette on the left and connect them to create your automation workflow.
                  </p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Config Panel */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onUpdate={updateNodeData}
          />
        )}
      </div>

      {/* Execute Workflow Modal */}
      {showExecuteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">Execute Workflow</h3>
                  <p className="text-xs text-zinc-500">Select leads to run &quot;{workflowName}&quot; on</p>
                </div>
              </div>
              <button onClick={() => { setShowExecuteModal(false); setSelectedLeadIds([]); }} className="p-2 hover:bg-zinc-100 rounded-lg">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="px-6 py-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Search leads..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
                <button onClick={selectAllLeads} className="px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                  Select All
                </button>
                <button onClick={() => setSelectedLeadIds([])} className="px-3 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors">
                  Clear
                </button>
              </div>
              {selectedLeadIds.length > 0 && (
                <p className="text-xs text-emerald-600 mt-2 font-medium">
                  {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1.5">
              {loadingLeads ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                </div>
              ) : executeLeads.filter(l =>
                l.name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
                l.email?.toLowerCase().includes(leadSearch.toLowerCase()) ||
                l.company?.toLowerCase().includes(leadSearch.toLowerCase())
              ).length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">No leads found</p>
                  <p className="text-xs text-zinc-400 mt-1">Import leads first from the Leads page</p>
                </div>
              ) : (
                executeLeads
                  .filter(l =>
                    l.name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
                    l.email?.toLowerCase().includes(leadSearch.toLowerCase()) ||
                    l.company?.toLowerCase().includes(leadSearch.toLowerCase())
                  )
                  .map(lead => (
                    <button
                      key={lead.id}
                      onClick={() => toggleLeadSelection(lead.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        selectedLeadIds.includes(lead.id)
                          ? 'border-emerald-300 bg-emerald-50/50 ring-1 ring-emerald-200'
                          : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selectedLeadIds.includes(lead.id)
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-zinc-300'
                      }`}>
                        {selectedLeadIds.includes(lead.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-800 truncate">{lead.name}</p>
                        <p className="text-xs text-zinc-400 truncate">{lead.email} {lead.company ? `· ${lead.company}` : ''}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        lead.status === 'new' ? 'bg-blue-50 text-blue-600'
                        : lead.status === 'contacted' ? 'bg-amber-50 text-amber-600'
                        : lead.status === 'converted' ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {lead.status}
                      </span>
                    </button>
                  ))
              )}
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-between">
              <p className="text-xs text-zinc-400">
                {nodes.length} nodes · {edges.length} connections
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowExecuteModal(false); setSelectedLeadIds([]); }}
                  className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecute}
                  disabled={executing || selectedLeadIds.length === 0}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {executing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Execute on {selectedLeadIds.length} Lead{selectedLeadIds.length > 1 ? 's' : ''}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NodePalette({ onDragStart }) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});

  const toggle = (name) => setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));

  const filtered = paletteCategories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) =>
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <div className="w-60 bg-white border-r border-zinc-200 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-zinc-100">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.map((cat) => (
          <div key={cat.name}>
            <button
              onClick={() => toggle(cat.name)}
              className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-700"
            >
              {collapsed[cat.name] ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              {cat.name}
              <span className="text-zinc-300 font-normal ml-auto">{cat.items.length}</span>
            </button>
            {!collapsed[cat.name] && (
              <div className="space-y-1 mb-2">
                {cat.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, item.type)}
                      className={`flex items-center gap-2 p-2 rounded-lg border border-zinc-200 cursor-grab active:cursor-grabbing ${item.hoverBorder} ${item.hoverBg} transition-all group`}
                    >
                      <div className={`w-7 h-7 rounded-md ${item.bgClass} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-zinc-800 leading-tight">{item.label}</div>
                        <div className="text-[10px] text-zinc-400 truncate">{item.description}</div>
                      </div>
                      <GripVertical className="w-3 h-3 text-zinc-300 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
