import { randomUUID } from 'node:crypto';
import { getDb } from '../db/index.js';

interface SessionRow {
  id: string;
  quiz_id: string;
  pin: string;
  status: string;
  host_socket_id: string | null;
  settings: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

interface PlayerRow {
  id: string;
  session_id: string;
  display_name: string;
  socket_id: string | null;
  score: number;
  correct_answers: number;
  total_answers: number;
  is_connected: number;
  joined_at: string;
}

export function generatePin(): string {
  const db = getDb();
  let pin: string;
  let attempts = 0;
  do {
    pin = String(Math.floor(100000 + Math.random() * 900000));
    const existing = db.prepare(
      "SELECT id FROM game_sessions WHERE pin = ? AND status != 'FINISHED'"
    ).get(pin);
    if (!existing) return pin;
    attempts++;
  } while (attempts < 100);
  throw new Error('Could not generate unique PIN after 100 attempts');
}

export function createSession(
  quizId: string,
  hostSocketId: string,
  settings: Record<string, unknown>
) {
  const db = getDb();
  const id = randomUUID();
  const pin = generatePin();
  db.prepare(
    'INSERT INTO game_sessions (id, quiz_id, pin, status, host_socket_id, settings) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, quizId, pin, 'WAITING', hostSocketId, JSON.stringify(settings));
  return { id, pin, status: 'WAITING' as const };
}

export function getSessionByPin(pin: string) {
  const db = getDb();
  const session = db.prepare(
    "SELECT * FROM game_sessions WHERE pin = ? AND status != 'FINISHED'"
  ).get(pin) as SessionRow | undefined;
  if (!session) return null;
  const players = db.prepare(
    'SELECT * FROM session_players WHERE session_id = ? ORDER BY score DESC'
  ).all(session.id) as PlayerRow[];
  return { ...session, settings: session.settings ? JSON.parse(session.settings) : {}, players };
}

export function getSessionById(id: string) {
  const db = getDb();
  const session = db.prepare('SELECT * FROM game_sessions WHERE id = ?').get(id) as SessionRow | undefined;
  if (!session) return null;
  const players = db.prepare(
    'SELECT * FROM session_players WHERE session_id = ? ORDER BY score DESC'
  ).all(session.id) as PlayerRow[];
  return { ...session, settings: session.settings ? JSON.parse(session.settings) : {}, players };
}

export function updateSessionStatus(id: string, status: string) {
  const db = getDb();
  const extras: string[] = [];
  const params: unknown[] = [status];

  if (status === 'STARTING' || status === 'QUESTION_ACTIVE') {
    extras.push("started_at = COALESCE(started_at, datetime('now'))");
  }
  if (status === 'FINISHED') {
    extras.push("finished_at = datetime('now')");
  }

  const setClause = ['status = ?', ...extras].join(', ');
  params.push(id);
  db.prepare(`UPDATE game_sessions SET ${setClause} WHERE id = ?`).run(...params);
}

export function updateSessionHostSocket(id: string, socketId: string) {
  const db = getDb();
  db.prepare('UPDATE game_sessions SET host_socket_id = ? WHERE id = ?').run(socketId, id);
}

export function addPlayer(sessionId: string, displayName: string, socketId: string) {
  const db = getDb();
  const id = randomUUID();

  let finalName = displayName.trim().slice(0, 20);
  const existingNames = db.prepare(
    'SELECT display_name FROM session_players WHERE session_id = ?'
  ).all(sessionId) as { display_name: string }[];

  const nameSet = new Set(existingNames.map((p) => p.display_name));
  if (nameSet.has(finalName)) {
    let counter = 2;
    while (nameSet.has(`${finalName} (${counter})`)) counter++;
    finalName = `${finalName} (${counter})`;
  }

  db.prepare(
    'INSERT INTO session_players (id, session_id, display_name, socket_id) VALUES (?, ?, ?, ?)'
  ).run(id, sessionId, finalName, socketId);

  return { id, displayName: finalName };
}

export function removePlayer(sessionId: string, playerId: string) {
  const db = getDb();
  db.prepare('DELETE FROM session_players WHERE id = ? AND session_id = ?').run(playerId, sessionId);
}

export function updatePlayerConnection(playerId: string, socketId: string | null, connected: boolean) {
  const db = getDb();
  db.prepare(
    'UPDATE session_players SET socket_id = ?, is_connected = ? WHERE id = ?'
  ).run(socketId, connected ? 1 : 0, playerId);
}

export function getPlayerBySocketId(socketId: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM session_players WHERE socket_id = ?').get(socketId) as PlayerRow | undefined;
}

export function getActiveSessions() {
  const db = getDb();
  const sessions = db.prepare(
    "SELECT gs.*, COUNT(sp.id) as player_count FROM game_sessions gs LEFT JOIN session_players sp ON sp.session_id = gs.id WHERE gs.status != 'FINISHED' GROUP BY gs.id ORDER BY gs.created_at DESC"
  ).all() as (SessionRow & { player_count: number })[];
  return sessions.map((s) => ({ ...s, settings: s.settings ? JSON.parse(s.settings) : {} }));
}

export function finishSession(sessionId: string) {
  updateSessionStatus(sessionId, 'FINISHED');
}

export function getSessionHistory() {
  const db = getDb();
  return db.prepare(`
    SELECT gs.*, q.title as quiz_title, COUNT(sp.id) as player_count
    FROM game_sessions gs
    LEFT JOIN quizzes q ON q.id = gs.quiz_id
    LEFT JOIN session_players sp ON sp.session_id = gs.id
    WHERE gs.status = 'FINISHED'
    GROUP BY gs.id
    ORDER BY gs.finished_at DESC
  `).all();
}

export function getSessionResults(sessionId: string) {
  const db = getDb();
  const session = getSessionById(sessionId);
  if (!session) return null;

  const players = db.prepare(
    'SELECT * FROM session_players WHERE session_id = ? ORDER BY score DESC, correct_answers DESC'
  ).all(sessionId) as PlayerRow[];

  const responses = db.prepare(
    'SELECT qr.*, q.text as question_text FROM question_responses qr JOIN questions q ON q.id = qr.question_id WHERE qr.session_id = ?'
  ).all(sessionId);

  const questionStats = db.prepare(`
    SELECT q.id, q.text, q.order_index,
      COUNT(qr.id) as total_responses,
      SUM(CASE WHEN qr.is_correct = 1 THEN 1 ELSE 0 END) as correct_count,
      AVG(qr.response_time_ms) as avg_response_time
    FROM questions q
    JOIN game_sessions gs ON gs.quiz_id = q.quiz_id
    LEFT JOIN question_responses qr ON qr.question_id = q.id AND qr.session_id = ?
    WHERE gs.id = ?
    GROUP BY q.id
    ORDER BY q.order_index
  `).all(sessionId, sessionId);

  return { session, players, responses, questionStats };
}

export function exportSessionCSV(sessionId: string): string | null {
  const results = getSessionResults(sessionId);
  if (!results) return null;

  const lines: string[] = ['Rank,Display Name,Score,Correct Answers,Total Answers,Accuracy'];
  results.players.forEach((p, i) => {
    const accuracy = p.total_answers > 0
      ? ((p.correct_answers / p.total_answers) * 100).toFixed(1)
      : '0.0';
    lines.push(`${i + 1},"${p.display_name}",${p.score},${p.correct_answers},${p.total_answers},${accuracy}%`);
  });
  return lines.join('\n');
}
