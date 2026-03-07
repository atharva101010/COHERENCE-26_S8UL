import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import leadsRouter from './routes/leads.js';
import statsRouter from './routes/stats.js';
import workflowsRouter from './routes/workflows.js';
import credentialsRouter from './routes/credentials.js';
import aiRouter from './routes/ai.js';
import executionsRouter from './routes/executions.js';
import settingsRouter from './routes/settings.js';
import messagesRouter from './routes/messages.js';
import channelsRouter from './routes/channels.js';
import profileRouter from './routes/profile.js';
import templatesRouter from './routes/templates.js';
import featuresRouter from './routes/features.js';

dotenv.config();

// Validate required env vars at startup
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Log optional service configuration status
const optionalServices = [
  { name: 'Groq AI', key: 'GROQ_API_KEY' },
  { name: 'SMTP Email', key: 'SMTP_HOST' },
  { name: 'WhatsApp', key: 'WHATSAPP_ACCESS_TOKEN' },
  { name: 'Telegram', key: 'TELEGRAM_BOT_TOKEN' },
  { name: 'Slack', key: 'SLACK_WEBHOOK_URL' },
  { name: 'Discord', key: 'DISCORD_WEBHOOK_URL' },
];
const configuredServices = optionalServices.filter(s => process.env[s.key]).map(s => s.name);
const unconfiguredServices = optionalServices.filter(s => !process.env[s.key]).map(s => s.name);

const app = express();
const httpServer = createServer(app);
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:5173']
  : ['http://localhost:5173'];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors({
  origin: allowedOrigins
}));
app.use(express.json({ limit: '10mb' }));

// Make io accessible to routes
app.set('io', io);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/leads', leadsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/workflows', workflowsRouter);
app.use('/api/credentials', credentialsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/executions', executionsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/features', featuresRouter);

// POST /api/seed/reset — Reset demo data by re-running seed
app.post('/api/seed/reset', async (req, res) => {
  try {
    const { seed } = await import('./seed.js');
    await seed();
    res.json({ success: true, message: 'Demo data reset successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset demo data: ' + err.message });
  }
});

// Serve frontend static files in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');

app.use(express.static(frontendDist, {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Socket.io connection
io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`FlowReach AI backend running on port ${PORT}`);
  if (configuredServices.length > 0) console.log(`  Services enabled: ${configuredServices.join(', ')}`);
  if (unconfiguredServices.length > 0) console.log(`  Services not configured: ${unconfiguredServices.join(', ')} (mock/fallback mode)`);
});

export { app, io };
