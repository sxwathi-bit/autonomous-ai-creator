import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { startAutonomousScheduler } from './src/backend/autonomous.ts';
import { db } from './src/backend/database.ts';
import { apiRouter } from './src/backend/routes.ts';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Initialize Database
  await db.init();

  // Middleware
  app.use(cors({
    origin: process.env.WEB_ORIGIN || '*',
    credentials: true,
  }));
  app.use(express.json());

  // Health Endpoint: GET /health
  app.get('/health', (req, res) => {
    return res.status(200).json({
      status: 'ok',
      database: db.getHealthStatus(),
      scheduler: 'running',
    });
  });

  // API Routes: /api/*
  app.use('/api', apiRouter);

  // Vite Middleware in development vs Static Dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start Express Server on 0.0.0.0:3000
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Autonomous AI Creator Server running on http://0.0.0.0:${PORT}`);

    // Start Persistent Background Worker Scheduler
    startAutonomousScheduler();
  });
}

startServer().catch((err) => {
  console.error('[SERVER] Fatal server startup error:', err);
  process.exit(1);
});
