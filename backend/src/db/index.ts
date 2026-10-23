import path from 'node:path';
import fs from 'node:fs';
import type Database from 'better-sqlite3';
import { initializeDatabase } from './schema.js';

let db: Database.Database | null = null;

export function initDb(dbPath?: string): Database.Database {
  const resolvedPath = dbPath ?? path.resolve(import.meta.dirname, '..', '..', 'data', 'quizspark.db');
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  db = initializeDatabase(resolvedPath);
  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}
