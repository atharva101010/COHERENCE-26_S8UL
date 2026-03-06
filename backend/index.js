import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import leadsRouter from './routes/leads.js';
import statsRouter from './routes/stats.js';
import workflowsRouter from './routes/workflows.js';
import credentialsRouter from './routes/credentials.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
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
