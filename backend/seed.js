import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const firstNames = ['Aarav', 'Ishita', 'Rohan', 'Priya', 'Vikram', 'Ananya', 'Arjun', 'Diya', 'Karan', 'Neha',
  'Siddharth', 'Meera', 'Aditya', 'Riya', 'Raj', 'Kavya', 'Nikhil', 'Pooja', 'Sahil', 'Tanya',
  'Amit', 'Sneha', 'Harsh', 'Simran', 'Vivek', 'Aisha', 'Pranav', 'Nisha', 'Manish', 'Shreya',
  'Rahul', 'Anjali', 'Dev', 'Ritika', 'Akash', 'Kriti', 'Mohit', 'Swati', 'Gaurav', 'Pallavi',
  'Kunal', 'Deepika', 'Varun', 'Aditi', 'Tushar', 'Sakshi', 'Dhruv', 'Megha', 'Yash', 'Komal'];

const lastNames = ['Sharma', 'Patel', 'Gupta', 'Singh', 'Kumar', 'Joshi', 'Mehta', 'Verma', 'Reddy', 'Nair',
  'Chopra', 'Das', 'Rao', 'Malhotra', 'Shah', 'Iyer', 'Bhat', 'Kapoor', 'Desai', 'Agarwal',
  'Chauhan', 'Trivedi', 'Banerjee', 'Khanna', 'Sinha', 'Mishra', 'Saxena', 'Tiwari', 'Pandey', 'Bhatt'];

const companies = ['TechCorp India', 'InnovateLabs', 'CloudPulse AI', 'DataVista', 'NexaFlow',
  'QuantumByte', 'SkyReach Digital', 'PrimeSoft', 'ZenithTech', 'VeloTech',
  'BrightPath Solutions', 'CodeNest', 'Pixel Dynamics', 'SwiftScale', 'AstraLogic',
  'OrbitAI', 'TrueNorth Systems', 'EchoTech', 'FusionWorks', 'MindBridge'];

const titles = ['CEO', 'CTO', 'VP Engineering', 'Head of Marketing', 'Product Manager',
  'Engineering Lead', 'Director of Sales', 'Growth Manager', 'Founder', 'COO',
  'Marketing Director', 'Head of Product', 'VP Sales', 'CFO', 'Technical Lead'];

const statuses = ['new', 'contacted', 'replied', 'converted', 'bounced'];
const statusWeights = [30, 25, 20, 15, 10]; // percentages

function pickWeighted(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return items[i];
  }
  return items[items.length - 1];
}

function randomDate(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(Math.floor(Math.random() * 14) + 8, Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
}

function buildLeads() {
  const leads = [];
  for (let i = 0; i < 50; i++) {
    const first = firstNames[i];
    const last = lastNames[i % lastNames.length];
    const company = companies[i % companies.length];
    const domain = company.toLowerCase().replaceAll(/\s+/g, '').replaceAll(/[^a-z]/g, '') + '.io';
    leads.push({
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
      company,
      title: titles[i % titles.length],
      status: pickWeighted(statuses, statusWeights),
      source: ['csv_import', 'manual', 'api'][i % 3],
      created_at: randomDate(30),
    });
  }
  return leads;
}

function getExecutionStatus(i) {
  if (i < 8) return 'completed';
  if (i < 10) return 'failed';
  return 'running';
}

function buildExecutions(workflows, allLeads) {
  const executions = [];
  for (let i = 0; i < 12; i++) {
    const wf = workflows[i % workflows.length];
    const lead = allLeads[i % allLeads.length];
    const status = getExecutionStatus(i);
    const startedAt = randomDate(7);
    const completedAt = status === 'running' ? null : new Date(new Date(startedAt).getTime() + Math.random() * 60000).toISOString();

    executions.push({
      workflow_id: wf.id,
      status,
      started_at: startedAt,
      completed_at: completedAt,
      lead_id: lead.id,
      logs: JSON.stringify([
        { node: 'Start', status: 'completed', ts: startedAt },
        { node: 'AI Generate', status: 'completed', ts: new Date(new Date(startedAt).getTime() + 5000).toISOString() },
        { node: status === 'failed' ? 'Email' : 'End', status: status === 'failed' ? 'error' : 'completed', ts: completedAt || new Date().toISOString(), error: status === 'failed' ? 'SMTP connection refused' : undefined },
      ]),
    });
  }
  return executions;
}

function buildMessages(insertedExecs, allLeads) {
  return insertedExecs
    .filter(ex => ex.status === 'completed')
    .map((ex, i) => {
      const lead = allLeads.find(l => l.id === ex.lead_id) || allLeads[0];
      return {
        lead_id: ex.lead_id,
        execution_id: ex.id,
        type: 'email',
        subject: `Outreach to ${lead.name}`,
        body: `Hi ${lead.name},\n\nI noticed your work at ${lead.email.split('@')[1].replace('.io', '')}. I'd love to connect about how FlowReach AI can help your team.\n\nBest regards`,
        status: i < 4 ? 'sent' : 'delivered',
        sent_at: ex.completed_at,
      };
    });
}

async function seedLeads() {
  const leads = buildLeads();
  await supabase.from('leads').delete().in('source', ['csv_import', 'manual', 'api']);
  const { error: leadErr } = await supabase.from('leads').insert(leads);
  if (leadErr) console.error('  ❌ Leads error:', leadErr.message);
  else console.log(`  ✓ Seeded ${leads.length} leads`);
}

async function seedExecutionsAndMessages() {
  const { data: workflows } = await supabase.from('workflows').select('id, name').limit(5);
  const { data: allLeads } = await supabase.from('leads').select('id, name, email').limit(20);

  if (!workflows?.length || !allLeads?.length) {
    console.log('  ⚠ No workflows or leads found — skipping executions/messages');
    return;
  }

  const executions = buildExecutions(workflows, allLeads);
  const { data: insertedExecs, error: execErr } = await supabase.from('executions').insert(executions).select('id, lead_id, status, completed_at');
  if (execErr) {
    console.error('  ❌ Executions error:', execErr.message);
    return;
  }
  console.log(`  ✓ Seeded ${insertedExecs.length} executions`);

  if (insertedExecs?.length) {
    const messages = buildMessages(insertedExecs, allLeads);
    const { error: msgErr } = await supabase.from('messages').insert(messages);
    if (msgErr) console.error('  ❌ Messages error:', msgErr.message);
    else console.log(`  ✓ Seeded ${messages.length} messages`);
  }
}

async function seedDailyCounts() {
  const dailyCounts = [];
  for (let d = 6; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    dailyCounts.push({
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 30) + (d === 0 ? 5 : 3),
    });
  }
  const { error: dailyErr } = await supabase.from('daily_send_counts').upsert(dailyCounts, { onConflict: 'date' });
  if (dailyErr) console.error('  ❌ Daily counts error:', dailyErr.message);
  else console.log(`  ✓ Seeded ${dailyCounts.length} daily send counts`);
}

async function seedBlacklist() {
  const blacklistEntries = [
    { email: 'spam@blocked.com', reason: 'Known spam sender' },
    { email: '@competitor.io', reason: 'Competitor domain' },
    { email: 'unsubscribed@test.com', reason: 'Requested removal' },
  ];
  const { error: blErr } = await supabase.from('blacklist').upsert(blacklistEntries, { onConflict: 'email', ignoreDuplicates: true });
  if (blErr) console.error('  ❌ Blacklist error:', blErr.message);
  else console.log(`  ✓ Seeded ${blacklistEntries.length} blacklist entries`);
}

async function seedFollowUpSequences() {
  const sequences = [
    {
      name: 'Cold Outreach Follow-Up',
      trigger_condition: 'no_reply',
      max_attempts: 3,
      status: 'active',
      enrolled_count: 12,
      completed_count: 5,
      steps: JSON.stringify([
        { delay_hours: 48, action: 'send_email', subject: 'Quick follow-up — {{company}}', body: 'Hi {{name}},\n\nI reached out a couple of days ago about how we can help {{company}} streamline your outreach. I know things get busy, so I wanted to bump this to the top of your inbox.\n\nWould you have 15 minutes this week for a quick call?\n\nBest,\nFlowReach AI Team' },
        { delay_hours: 96, action: 'send_email', subject: 'Still interested? One more thing…', body: 'Hi {{name}},\n\nI wanted to share a quick case study — one of our clients in a similar space saw a 3x improvement in reply rates after switching to automated, AI-personalized outreach.\n\nHappy to walk you through how it works. Would Thursday or Friday work?\n\nCheers,\nFlowReach AI Team' },
        { delay_hours: 168, action: 'send_email', subject: 'Last check-in from FlowReach', body: 'Hi {{name}},\n\nI don\'t want to be a bother — this will be my last follow-up. If the timing isn\'t right, no worries at all.\n\nBut if you\'re still exploring ways to automate outreach at {{company}}, I\'d love to help whenever you\'re ready.\n\nWishing you the best,\nFlowReach AI Team' },
      ]),
    },
    {
      name: 'Post-Demo Nurture Sequence',
      trigger_condition: 'no_reply',
      max_attempts: 3,
      status: 'active',
      enrolled_count: 8,
      completed_count: 3,
      steps: JSON.stringify([
        { delay_hours: 24, action: 'send_email', subject: 'Thanks for the demo, {{name}}!', body: 'Hi {{name}},\n\nGreat chatting with you today! As promised, here\'s a quick recap of what we covered:\n\n• AI-powered email personalization\n• Multi-channel outreach (Email, Telegram, WhatsApp, Slack)\n• Real-time workflow execution with live monitoring\n\nLet me know if you have any questions or want to explore a specific feature deeper.\n\nBest,\nFlowReach AI Team' },
        { delay_hours: 72, action: 'send_email', subject: 'Have you had a chance to think about it?', body: 'Hi {{name}},\n\nJust checking in after our demo. Our team at {{company}} could start seeing results within the first week of setup.\n\nWe also offer a free pilot program — would that be helpful for your evaluation?\n\nLooking forward to hearing from you,\nFlowReach AI Team' },
        { delay_hours: 144, action: 'send_email', subject: 'Special offer for {{company}}', body: 'Hi {{name}},\n\nI wanted to reach out one last time with something special. We\'re offering an extended free trial for teams who sign up this month.\n\nIf you\'re still evaluating outreach tools, this could be a great opportunity to test FlowReach AI risk-free.\n\nLet me know!\nFlowReach AI Team' },
      ]),
    },
    {
      name: 'Re-engagement Campaign',
      trigger_condition: 'no_open',
      max_attempts: 2,
      status: 'active',
      enrolled_count: 20,
      completed_count: 7,
      steps: JSON.stringify([
        { delay_hours: 72, action: 'send_email', subject: '{{name}}, we miss you at {{company}}!', body: 'Hi {{name}},\n\nIt\'s been a while since we last connected. I wanted to share some exciting updates:\n\n• New AI-powered workflow templates\n• Telegram & WhatsApp integrations\n• Advanced lead scoring with enrichment\n\nWould love to show you what\'s new — are you free for a quick 10-minute catch-up?\n\nBest regards,\nFlowReach AI Team' },
        { delay_hours: 168, action: 'send_email', subject: 'A fresh start with FlowReach AI?', body: 'Hi {{name}},\n\nWe\'ve made significant improvements since we last spoke, and I think {{company}} could really benefit from what we\'ve built.\n\nNo pressure — just reply "interested" and I\'ll send over the details.\n\nCheers,\nFlowReach AI Team' },
      ]),
    },
  ];

  // Delete old seed sequences, then insert new ones
  await supabase.from('follow_up_sequences').delete().in('name', sequences.map(s => s.name));
  const { error } = await supabase.from('follow_up_sequences').insert(sequences);
  if (error) console.error('  ❌ Follow-up sequences error:', error.message);
  else console.log(`  ✓ Seeded ${sequences.length} follow-up sequence templates`);
}

export async function seed() {
  console.log('🌱 Seeding FlowReach AI demo data...\n');
  await seedLeads();
  await seedExecutionsAndMessages();
  await seedDailyCounts();
  await seedBlacklist();
  await seedFollowUpSequences();
  console.log('\n✅ Seeding complete! Dashboard should now show real chart data.');
}

await seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
