import { randomUUID } from 'node:crypto';
import { getDb } from '../db/index.js';

export function calculateScore(
  questionPoints: number,
  remainingTimeMs: number,
  totalTimeMs: number,
  speedScoring: boolean
): number {
  if (!speedScoring) return questionPoints;
  const ratio = Math.max(0, Math.min(1, remainingTimeMs / totalTimeMs));
  return Math.round(questionPoints * (0.5 + 0.5 * ratio));
}

export function recordAnswer(
  sessionId: string,
  playerId: string,
  questionId: string,
  answerId: string | null,
  responseTimeMs: number,
  question: { points: number; time_limit: number },
  speedScoring: boolean
): { accepted: boolean; isCorrect: boolean; points: number } {
  const db = getDb();

  const existing = db.prepare(
    'SELECT id FROM question_responses WHERE session_id = ? AND player_id = ? AND question_id = ?'
  ).get(sessionId, playerId, questionId);
  if (existing) {
    return { accepted: false, isCorrect: false, points: 0 };
  }

  let isCorrect = false;
  if (answerId) {
    const answer = db.prepare(
      'SELECT is_correct FROM answer_options WHERE id = ? AND question_id = ?'
    ).get(answerId, questionId) as { is_correct: number } | undefined;
    isCorrect = answer?.is_correct === 1;
  }

  const totalTimeMs = question.time_limit * 1000;
  const remainingTimeMs = Math.max(0, totalTimeMs - responseTimeMs);
  const points = isCorrect ? calculateScore(question.points, remainingTimeMs, totalTimeMs, speedScoring) : 0;

  const doRecord = db.transaction(() => {
    db.prepare(
      'INSERT INTO question_responses (id, session_id, player_id, question_id, answer_id, is_correct, points, response_time_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(randomUUID(), sessionId, playerId, questionId, answerId, isCorrect ? 1 : 0, points, responseTimeMs);

    db.prepare(
      'UPDATE session_players SET score = score + ?, correct_answers = correct_answers + ?, total_answers = total_answers + 1 WHERE id = ?'
    ).run(points, isCorrect ? 1 : 0, playerId);
  });

  doRecord();
  return { accepted: true, isCorrect, points };
}

export function getLeaderboard(sessionId: string) {
  const db = getDb();
  const players = db.prepare(
    'SELECT id, display_name, score, correct_answers, total_answers, is_connected FROM session_players WHERE session_id = ? ORDER BY score DESC, correct_answers DESC, display_name ASC'
  ).all(sessionId) as {
    id: string;
    display_name: string;
    score: number;
    correct_answers: number;
    total_answers: number;
    is_connected: number;
  }[];

  let rank = 0;
  let lastScore = -1;
  return players.map((p, i) => {
    if (p.score !== lastScore) {
      rank = i + 1;
      lastScore = p.score;
    }
    return { ...p, rank };
  });
}

export function getQuestionStats(sessionId: string, questionId: string) {
  const db = getDb();

  const answers = db.prepare(`
    SELECT ao.id, ao.text, ao.is_correct, COUNT(qr.id) as count
    FROM answer_options ao
    LEFT JOIN question_responses qr ON qr.answer_id = ao.id AND qr.session_id = ?
    WHERE ao.question_id = ?
    GROUP BY ao.id
    ORDER BY ao.order_index
  `).all(sessionId, questionId);

  const totalResponses = db.prepare(
    'SELECT COUNT(*) as count FROM question_responses WHERE session_id = ? AND question_id = ?'
  ).get(sessionId, questionId) as { count: number };

  const correctCount = db.prepare(
    'SELECT COUNT(*) as count FROM question_responses WHERE session_id = ? AND question_id = ? AND is_correct = 1'
  ).get(sessionId, questionId) as { count: number };

  return {
    questionId,
    totalResponses: totalResponses.count,
    correctCount: correctCount.count,
    answers,
  };
}
