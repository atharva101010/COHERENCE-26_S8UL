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

dotenv.config();

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

app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`FlowReach AI backend running on port ${PORT}`);
});

export { app, io };
