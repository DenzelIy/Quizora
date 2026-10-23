import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { setupGameHandlers } from './gameHandler.js';

export function setupSocketIO(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingInterval: 10_000,
    pingTimeout: 20_000,
    maxHttpBufferSize: 1e6,
  });

  setupGameHandlers(io);

  return io;
}
