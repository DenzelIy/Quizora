import { randomUUID } from 'node:crypto';
import { getDb } from '../db/index.js';

interface CompletionData {
  packId: string;
  playerName: string;
  mode: 'practice' | 'exam' | 'griot';
  score: number;
  totalPoints: number;
  correctAnswers: number;
  totalQuestions: number;
  timeTakenSeconds?: number;
  details?: string;
}

export function recordCompletion(data: CompletionData): { id: string } {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO pack_completions (id, pack_id, player_name, mode, score, total_points, correct_answers, total_questions, time_taken_seconds, details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, data.packId, data.playerName, data.mode, data.score, data.totalPoints, data.correctAnswers, data.totalQuestions, data.timeTakenSeconds ?? null, data.details ?? null);
  return { id };
}

export function getPlayerStats(playerName: string) {
  const db = getDb();

  const completions = db.prepare(
    `SELECT pc.*, cp.title as pack_title, cp.subject
     FROM pack_completions pc
     JOIN content_packs cp ON cp.id = pc.pack_id
     WHERE pc.player_name = ?
     ORDER BY pc.completed_at DESC`
  ).all(playerName) as Array<{
    id: string; pack_id: string; player_name: string; mode: string;
    score: number; total_points: number; correct_answers: number; total_questions: number;
    time_taken_seconds: number | null; completed_at: string; details: string | null;
    pack_title: string; subject: string | null;
  }>;

  const totalCompleted = completions.length;
  const averageScore = totalCompleted > 0
    ? Math.round(completions.reduce((sum, c) => sum + (c.total_points > 0 ? (c.score / c.total_points) * 100 : 0), 0) / totalCompleted)
    : 0;

  const topicMap = new Map<string, { correct: number; total: number }>();

  for (const c of completions) {
    if (!c.details) continue;
    try {
      const parsed = JSON.parse(c.details) as Array<{ topic?: string; correct: boolean }>;
      for (const item of parsed) {
        const topic = item.topic || c.subject || 'General';
        const entry = topicMap.get(topic) || { correct: 0, total: 0 };
        entry.total++;
        if (item.correct) entry.correct++;
        topicMap.set(topic, entry);
      }
    } catch {
      // details not in expected format
    }
  }

  const topicBreakdown = Array.from(topicMap.entries()).map(([topic, stats]) => ({
    topic,
    correct: stats.correct,
    total: stats.total,
    percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
  })).sort((a, b) => b.percentage - a.percentage);

  return { totalCompleted, averageScore, topicBreakdown };
}

export function getPackLeaderboard(packId: string) {
  const db = getDb();
  const entries = db.prepare(
    `SELECT player_name, score, total_points, completed_at
     FROM pack_completions
     WHERE pack_id = ?
     ORDER BY score DESC, time_taken_seconds ASC
     LIMIT 20`
  ).all(packId) as Array<{
    player_name: string; score: number; total_points: number; completed_at: string;
  }>;

  return {
    entries: entries.map(e => ({
      playerName: e.player_name,
      score: e.score,
      totalPoints: e.total_points,
      completedAt: e.completed_at,
    })),
  };
}
