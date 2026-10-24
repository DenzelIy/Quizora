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

export function addPlayer(sessionId: string, displayName: string, socketId: string, avatar: string | null = null) {
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
    'INSERT INTO session_players (id, session_id, display_name, socket_id, avatar) VALUES (?, ?, ?, ?, ?)'
  ).run(id, sessionId, finalName, socketId, avatar);

  return { id, displayName: finalName };
}

export function removePlayer(sessionId: string, playerId: string) {
  const db = getDb();
  db.prepare('DELETE FROM session_players WHERE id = ? AND session_id = ?').run(playerId, sessionId);
}

export function updatePlayerAvatar(playerId: string, avatar: string) {
  const db = getDb();
  db.prepare('UPDATE session_players SET avatar = ? WHERE id = ?').run(avatar, playerId);
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

export function finishSession(sessionId: string) {
  updateSessionStatus(sessionId, 'FINISHED');
}

type SessionSummaryRow = SessionRow & { quiz_title: string | null; player_count: number };

const SESSION_SUMMARY_SQL = `
  SELECT gs.*, q.title as quiz_title, COUNT(sp.id) as player_count
  FROM game_sessions gs
  LEFT JOIN quizzes q ON q.id = gs.quiz_id
  LEFT JOIN session_players sp ON sp.session_id = gs.id`;

function toSessionSummary(row: SessionSummaryRow) {
  return {
    id: row.id,
    quizId: row.quiz_id,
    quizTitle: row.quiz_title ?? 'Deleted quiz',
    pin: row.pin,
    status: row.status,
    playerCount: row.player_count,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
  };
}

/** All sessions, newest first, in the shape the game history page expects. */
export function getSessionSummaries() {
  const db = getDb();
  const rows = db.prepare(`${SESSION_SUMMARY_SQL}
    GROUP BY gs.id
    ORDER BY COALESCE(gs.finished_at, gs.created_at) DESC
  `).all() as SessionSummaryRow[];
  return rows.map(toSessionSummary);
}

/** Final rankings, per-question answer breakdown and per-player stats for one game. */
export function getSessionResults(sessionId: string) {
  const db = getDb();
  const sessionRow = db.prepare(`${SESSION_SUMMARY_SQL} WHERE gs.id = ? GROUP BY gs.id`).get(sessionId) as
    | SessionSummaryRow
    | undefined;
  if (!sessionRow) return null;

  const playerRows = db.prepare(
    'SELECT * FROM session_players WHERE session_id = ? ORDER BY score DESC, correct_answers DESC, display_name ASC'
  ).all(sessionId) as (PlayerRow & { avatar: string | null })[];

  // Players on the same score share a rank.
  let rank = 0;
  let lastScore = -1;
  const players = playerRows.map((p, i) => {
    if (p.score !== lastScore) {
      rank = i + 1;
      lastScore = p.score;
    }
    return {
      id: p.id,
      displayName: p.display_name,
      avatar: p.avatar ?? undefined,
      score: p.score,
      correctAnswers: p.correct_answers,
      totalAnswers: p.total_answers,
      rank,
    };
  });

  const questions = db.prepare(`
    SELECT q.id, q.text FROM questions q
    JOIN game_sessions gs ON gs.quiz_id = q.quiz_id
    WHERE gs.id = ?
    ORDER BY q.order_index
  `).all(sessionId) as { id: string; text: string }[];

  const answerCounts = db.prepare(`
    SELECT ao.id, ao.text, ao.is_correct, COUNT(qr.id) as count
    FROM answer_options ao
    LEFT JOIN question_responses qr ON qr.answer_id = ao.id AND qr.session_id = ?
    WHERE ao.question_id = ?
    GROUP BY ao.id
    ORDER BY ao.order_index
  `);
  const responseCounts = db.prepare(`
    SELECT COUNT(*) as total, COALESCE(SUM(is_correct), 0) as correct
    FROM question_responses WHERE session_id = ? AND question_id = ?
  `);

  const questionStats = questions.map((q) => {
    const counts = responseCounts.get(sessionId, q.id) as { total: number; correct: number };
    const answers = answerCounts.all(sessionId, q.id) as { id: string; text: string; is_correct: number; count: number }[];
    return {
      questionId: q.id,
      questionText: q.text,
      correctCount: counts.correct,
      totalCount: counts.total,
      answerDistribution: answers.map((a) => ({
        answerId: a.id,
        text: a.text,
        count: a.count,
        isCorrect: a.is_correct === 1,
      })),
    };
  });

  return { session: toSessionSummary(sessionRow), players, questionStats };
}

/** Quotes a CSV cell and stops spreadsheet apps from treating names like "=SUM(...)" as formulas. */
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function exportSessionCSV(sessionId: string): string | null {
  const results = getSessionResults(sessionId);
  if (!results) return null;

  const lines: string[] = ['Rank,Display Name,Score,Correct Answers,Total Answers,Accuracy'];
  for (const p of results.players) {
    const accuracy = p.totalAnswers > 0 ? ((p.correctAnswers / p.totalAnswers) * 100).toFixed(1) : '0.0';
    lines.push(`${p.rank},${csvCell(p.displayName)},${p.score},${p.correctAnswers},${p.totalAnswers},${accuracy}%`);
  }
  return lines.join('\n');
}
