import { Router } from 'express';
import supabase from '../db.js';
import { WorkflowExecutor } from '../executor.js';

const router = Router();

// POST /api/executions/run — Execute a workflow on selected leads
router.post('/run', async (req, res) => {
  try {
    const { workflowId, leadIds } = req.body;

    if (!workflowId) {
      return res.status(400).json({ error: 'workflowId is required' });
    }
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds array is required' });
    }

    // Fetch workflow
    const { data: workflow, error: wfError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (wfError || !workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Validate workflow has nodes and a start node
    const nodes = typeof workflow.nodes === 'string' ? JSON.parse(workflow.nodes) : workflow.nodes || [];
    const edges = typeof workflow.edges === 'string' ? JSON.parse(workflow.edges) : workflow.edges || [];

    if (nodes.length === 0) {
      return res.status(400).json({ error: 'Workflow has no nodes. Add at least a Start and End node.' });
    }

    const hasStart = nodes.some(n => n.type === 'startNode');
    if (!hasStart) {
      return res.status(400).json({ error: 'Workflow is missing a Start node.' });
    }

    const hasEnd = nodes.some(n => n.type === 'endNode');
    if (!hasEnd) {
      return res.status(400).json({ error: 'Workflow is missing an End node. Add one to complete the flow.' });
    }

    if (edges.length === 0 && nodes.length > 1) {
      return res.status(400).json({ error: 'Workflow nodes are not connected. Draw edges between nodes.' });
    }

    // Fetch leads
    const { data: leads, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .in('id', leadIds.map(Number));

    if (leadError || !leads || leads.length === 0) {
      return res.status(404).json({ error: 'No leads found' });
    }

    const io = req.app.get('io');
    const executionIds = [];

    // Create execution records for each lead
    for (const lead of leads) {
      const { data: exec, error: execError } = await supabase
        .from('executions')
        .insert({
          workflow_id: workflow.id,
          lead_id: lead.id,
          status: 'pending',
          logs: JSON.stringify([]),
          current_node: null,
        })
        .select()
        .single();

      if (execError) {
        console.error('Failed to create execution:', execError.message);
        continue;
      }

      executionIds.push(exec.id);

      // Run executor asynchronously (don't await — fire and forget)
      const executor = new WorkflowExecutor({
        workflow,
        lead,
        executionId: exec.id,
        io,
      });

      executor.execute().catch(err => {
        console.error(`Execution ${exec.id} error:`, err);
      });
    }

    res.json({
      message: `Started ${executionIds.length} execution(s)`,
      executionIds,
      workflowName: workflow.name,
      leadCount: leads.length,
    });
  } catch (err) {
    console.error('Run execution error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/executions — List all executions
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    let query = supabase
      .from('executions')
      .select('*, workflows(name), leads(name, email)')
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // Parse logs
    const parsed = (data || []).map(exec => ({
      ...exec,
      logs: typeof exec.logs === 'string' ? JSON.parse(exec.logs) : exec.logs || [],
    }));

    res.json(parsed);
  } catch (err) {
    console.error('Fetch executions error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/executions/:id — Get single execution
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('executions')
      .select('*, workflows(name), leads(name, email)')
      .eq('id', Number(req.params.id))
      .single();

    if (error || !data) return res.status(404).json({ error: 'Execution not found' });

    data.logs = typeof data.logs === 'string' ? JSON.parse(data.logs) : data.logs || [];
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
