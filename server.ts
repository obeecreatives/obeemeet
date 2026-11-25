import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  handleCreateRoom,
  handleHealth,
  handleJoinToken,
  handleRoomAction,
} from './server/livekitCore.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    const result = handleHealth();
    res.status(result.status).json(result.body);
  });

  app.post('/api/room/create', async (req, res) => {
    const result = await handleCreateRoom((req.body ?? {}) as Record<string, unknown>);
    res.status(result.status).json(result.body);
  });

  app.post('/api/token', async (req, res) => {
    const result = await handleJoinToken(
      (req.body ?? {}) as Record<string, unknown>,
      req.headers.authorization
    );
    res.status(result.status).json(result.body);
  });

  app.post('/api/room/action', async (req, res) => {
    const result = await handleRoomAction(
      (req.body ?? {}) as Record<string, unknown>,
      req.headers.authorization
    );
    res.status(result.status).json(result.body);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ObeeMeet server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start ObeeMeet server:', err);
  process.exit(1);
});
