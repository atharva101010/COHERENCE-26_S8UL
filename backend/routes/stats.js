import { Router } from 'express';
import supabase from '../db.js';

const router = Router();

// GET /api/stats/overview
router.get('/overview', async (req, res) => {
  try {
    // Total leads
    const { count: totalLeads } = await supabase.from('leads').select('*', { count: 'exact', head: true });

    // Leads by status
    const { data: allLeads } = await supabase.from('leads').select('status');
    const statusCounts = {};
    for (const lead of (allLeads || [])) {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    }
    const leadsByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // Total workflows
    const { count: totalWorkflows } = await supabase.from('workflows').select('*', { count: 'exact', head: true });

    // Active workflows
    const { count: activeWorkflows } = await supabase.from('workflows').select('*', { count: 'exact', head: true }).eq('is_active', true);

    // Total executions
    const { count: totalExecutions } = await supabase.from('executions').select('*', { count: 'exact', head: true });

    // Executions by status
    const { data: allExecs } = await supabase.from('executions').select('status');
    const execCounts = {};
    for (const ex of (allExecs || [])) {
      execCounts[ex.status] = (execCounts[ex.status] || 0) + 1;
    }
    const executionsByStatus = Object.entries(execCounts).map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // Total messages sent
    const { count: totalMessagesSent } = await supabase.from('messages')
      .select('*', { count: 'exact', head: true })
      .in('status', ['sent', 'delivered', 'opened']);

    // Messages last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentMessages } = await supabase.from('messages')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    const msgByDate = {};
    for (const m of (recentMessages || [])) {
      const d = m.created_at.split('T')[0];
      msgByDate[d] = (msgByDate[d] || 0) + 1;
    }

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      last7Days.push({ date: dateStr, count: msgByDate[dateStr] || 0 });
    }

    // Recent leads (last 5)
    const { data: recentLeads } = await supabase.from('leads')
      .select('id, name, email, company, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // Conversion rate
    const convertedCount = leadsByStatus.find(s => s.status === 'converted')?.count || 0;
    const conversionRate = (totalLeads || 0) > 0 ? ((convertedCount / totalLeads) * 100).toFixed(1) : 0;

    res.json({
      totalLeads: totalLeads || 0,
      totalWorkflows: totalWorkflows || 0,
      activeWorkflows: activeWorkflows || 0,
      totalExecutions: totalExecutions || 0,
      totalMessagesSent: totalMessagesSent || 0,
      conversionRate: Number(conversionRate),
      leadsByStatus,
      executionsByStatus,
      messagesLast7Days: last7Days,
      recentLeads: recentLeads || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
