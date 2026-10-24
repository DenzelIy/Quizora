import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import { initDb } from './db/index.js';
import { seedContentPacks } from './db/seedPacks.js';
import quizRoutes from './routes/quizRoutes.js';
import packRoutes from './routes/packRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setupSocketIO } from './socket/index.js';
import { getLanAddresses } from './utils/network.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, '..', 'data', 'quizspark.db');

initDb(DB_PATH);
seedContentPacks();

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', quizRoutes);
app.use('/api', packRoutes);

const frontendDist = process.env.FRONTEND_DIST ?? path.join(__dirname, '..', '..', 'frontend', 'dist');
try {
  const fs = await import('node:fs');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }
} catch {
  // Frontend not built yet
}

app.use(errorHandler);

setupSocketIO(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Quizora Server running on port ${PORT}`);
  console.log(`  Local:   http://localhost:${PORT}`);

  const lanAddresses = getLanAddresses();
  for (const addr of lanAddresses) {
    console.log(`  Network: http://${addr.address}:${PORT}  (${addr.name})`);
  }

  if (lanAddresses.length === 0) {
    console.log('  No LAN addresses detected. Students must connect to this computer\'s IP.');
  }

  console.log('\n  Students can join by opening the Network URL in their browser.\n');
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
