import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/stats/overview
router.get('/overview', (req, res) => {
  // Total leads
  const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;

  // Leads by status
  const leadsByStatus = db.prepare(
    'SELECT status, COUNT(*) as count FROM leads GROUP BY status ORDER BY count DESC'
  ).all();

  // Total workflows
  const totalWorkflows = db.prepare('SELECT COUNT(*) as count FROM workflows').get().count;

  // Active workflows
  const activeWorkflows = db.prepare('SELECT COUNT(*) as count FROM workflows WHERE is_active = 1').get().count;

  // Total executions
  const totalExecutions = db.prepare('SELECT COUNT(*) as count FROM executions').get().count;

  // Executions by status
  const executionsByStatus = db.prepare(
    'SELECT status, COUNT(*) as count FROM executions GROUP BY status ORDER BY count DESC'
  ).all();

  // Total messages sent
  const totalMessagesSent = db.prepare(
    "SELECT COUNT(*) as count FROM messages WHERE status IN ('sent','delivered','opened')"
  ).get().count;

  // Messages last 7 days
  const messagesLast7Days = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM messages
    WHERE created_at >= DATE('now', '-7 days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all();

  // Fill in missing days with 0
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const found = messagesLast7Days.find((m) => m.date === dateStr);
    last7Days.push({ date: dateStr, count: found ? found.count : 0 });
  }

  // Recent leads (last 5)
  const recentLeads = db.prepare(
    'SELECT id, name, email, company, status, created_at FROM leads ORDER BY created_at DESC LIMIT 5'
  ).all();

  // Conversion rate
  const convertedLeads = db.prepare(
    "SELECT COUNT(*) as count FROM leads WHERE status = 'converted'"
  ).get().count;
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;

  res.json({
    totalLeads,
    totalWorkflows,
    activeWorkflows,
    totalExecutions,
    totalMessagesSent,
    conversionRate: Number(conversionRate),
    leadsByStatus,
    executionsByStatus,
    messagesLast7Days: last7Days,
    recentLeads
  });
});

export default router;
