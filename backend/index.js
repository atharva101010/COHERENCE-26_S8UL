import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import leadsRouter from './routes/leads.js';
import statsRouter from './routes/stats.js';
import workflowsRouter from './routes/workflows.js';
import credentialsRouter from './routes/credentials.js';
import aiRouter from './routes/ai.js';
import executionsRouter from './routes/executions.js';
import settingsRouter from './routes/settings.js';
import callsRouter from './routes/calls.js';
import whatsappService from './whatsapp.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: function(origin, callback) {
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Make io accessible to routes
app.set('io', io);

// Initialize WhatsApp client (scan QR code in terminal)
whatsappService.initialize();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WhatsApp connection status
app.get('/api/whatsapp/status', (req, res) => {
  const status = whatsappService.getStatus();
  res.json(status);
});

// API routes
app.use('/api/leads', leadsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/workflows', workflowsRouter);
app.use('/api/credentials', credentialsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/executions', executionsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/calls', callsRouter);

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
  console.log(`📱 WhatsApp: Scan QR code above to connect (if shown)`);
});

export { app, io };
