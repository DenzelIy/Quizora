import { randomUUID } from 'node:crypto';
import { getDb } from '../db/index.js';

interface PackRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  subject: string | null;
  tags: string | null;
  difficulty: string | null;
  grade_level: string | null;
  curriculum: string | null;
  author: string | null;
  source: string | null;
  source_url: string | null;
  license: string;
  version: number;
  cover_image: string | null;
  status: string;
  pack_type: string;
  estimated_duration_min: number | null;
  total_questions: number;
  times_used: number;
  created_at: string;
  updated_at: string;
}

interface ChapterRow {
  id: string;
  pack_id: string;
  title: string;
  description: string | null;
  content_text: string | null;
  image_url: string | null;
  order_index: number;
  chapter_type: string;
}

interface PackQuestionRow {
  id: string;
  pack_id: string;
  chapter_id: string | null;
  type: string;
  text: string;
  image_url: string | null;
  time_limit: number;
  points: number;
  explanation: string | null;
  topic: string | null;
  difficulty: string | null;
  order_index: number;
  math_notation: number;
}

interface PackAnswerRow {
  id: string;
  question_id: string;
  text: string;
  is_correct: number;
  order_index: number;
}

interface ObjectiveRow {
  id: string;
  pack_id: string;
  text: string;
  order_index: number;
}

interface SceneRow {
  id: string;
  pack_id: string;
  title: string;
  narrator_text: string;
  background_image: string | null;
  narrator_mood: string;
  audio_file: string | null;
  duration_seconds: number | null;
  order_index: number;
  question_id: string | null;
}

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try { return JSON.parse(tags); } catch { return []; }
}

function mapPack(row: PackRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? '',
    category: row.category,
    subject: row.subject ?? undefined,
    tags: parseTags(row.tags),
    difficulty: row.difficulty ?? 'mixed',
    gradeLevel: row.grade_level ?? undefined,
    curriculum: row.curriculum ?? undefined,
    author: row.author ?? undefined,
    source: row.source ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    license: row.license,
    version: row.version,
    coverImage: row.cover_image ?? undefined,
    status: row.status,
    packType: row.pack_type,
    estimatedDurationMin: row.estimated_duration_min ?? undefined,
    totalQuestions: row.total_questions,
    timesUsed: row.times_used,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAllPacks(category?: string) {
  const db = getDb();
  let sql = "SELECT * FROM content_packs WHERE status = 'active'";
  const params: unknown[] = [];
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  sql += ' ORDER BY updated_at DESC';
  const rows = db.prepare(sql).all(...params) as PackRow[];
  return rows.map(mapPack);
}

export function getPackBySlug(slug: string) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM content_packs WHERE slug = ?').get(slug) as PackRow | undefined;
  if (!row) return null;
  return getFullPack(row);
}

export function getPackById(id: string) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM content_packs WHERE id = ?').get(id) as PackRow | undefined;
  if (!row) return null;
  return getFullPack(row);
}

function getFullPack(row: PackRow) {
  const db = getDb();
  const pack = mapPack(row);

  const objectives = (db.prepare(
    'SELECT * FROM pack_objectives WHERE pack_id = ? ORDER BY order_index'
  ).all(row.id) as ObjectiveRow[]).map(o => ({
    id: o.id, packId: o.pack_id, text: o.text, orderIndex: o.order_index
  }));

  const chapters = (db.prepare(
    'SELECT * FROM pack_chapters WHERE pack_id = ? ORDER BY order_index'
  ).all(row.id) as ChapterRow[]).map(c => ({
    id: c.id, packId: c.pack_id, title: c.title, description: c.description ?? undefined,
    contentText: c.content_text ?? undefined, imageUrl: c.image_url ?? undefined,
    orderIndex: c.order_index, chapterType: c.chapter_type,
  }));

  const questionRows = db.prepare(
    'SELECT * FROM pack_questions WHERE pack_id = ? ORDER BY order_index'
  ).all(row.id) as PackQuestionRow[];

  const questions = questionRows.map(q => {
    const answers = (db.prepare(
      'SELECT * FROM pack_answer_options WHERE question_id = ? ORDER BY order_index'
    ).all(q.id) as PackAnswerRow[]).map(a => ({
      id: a.id, questionId: a.question_id, text: a.text,
      isCorrect: a.is_correct === 1, orderIndex: a.order_index,
    }));

    return {
      id: q.id, packId: q.pack_id, chapterId: q.chapter_id ?? undefined,
      type: q.type as 'multiple-choice' | 'true-false',
      text: q.text, imageUrl: q.image_url ?? undefined,
      timeLimit: q.time_limit, points: q.points,
      explanation: q.explanation ?? undefined, topic: q.topic ?? undefined,
      difficulty: q.difficulty ?? undefined, orderIndex: q.order_index,
      mathNotation: q.math_notation === 1, answers,
    };
  });

  const scenes = (db.prepare(
    'SELECT * FROM pack_scenes WHERE pack_id = ? ORDER BY order_index'
  ).all(row.id) as SceneRow[]).map(s => ({
    id: s.id, packId: s.pack_id, title: s.title, narratorText: s.narrator_text,
    backgroundImage: s.background_image ?? undefined, narratorMood: s.narrator_mood,
    audioFile: s.audio_file ?? undefined, durationSeconds: s.duration_seconds ?? undefined,
    orderIndex: s.order_index, questionId: s.question_id ?? undefined,
  }));

  return { ...pack, objectives, chapters, questions, scenes };
}

export function importPackQuestionsToQuiz(packId: string, questionIds: string[], quizId: string) {
  const db = getDb();

  const doImport = db.transaction(() => {
    const maxOrder = db.prepare(
      'SELECT COALESCE(MAX(order_index), -1) as max_order FROM questions WHERE quiz_id = ?'
    ).get(quizId) as { max_order: number };

    let orderIndex = maxOrder.max_order + 1;

    for (const pqId of questionIds) {
      const pq = db.prepare('SELECT * FROM pack_questions WHERE id = ? AND pack_id = ?').get(pqId, packId) as PackQuestionRow | undefined;
      if (!pq) continue;

      const newQId = randomUUID();
      db.prepare(
        'INSERT INTO questions (id, quiz_id, type, text, image_url, time_limit, points, explanation, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(newQId, quizId, pq.type, pq.text, pq.image_url, pq.time_limit, pq.points, pq.explanation, orderIndex);

      const answers = db.prepare(
        'SELECT * FROM pack_answer_options WHERE question_id = ? ORDER BY order_index'
      ).all(pqId) as PackAnswerRow[];

      for (const a of answers) {
        db.prepare(
          'INSERT INTO answer_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)'
        ).run(randomUUID(), newQId, a.text, a.is_correct, a.order_index);
      }

      db.prepare(
        'INSERT INTO pack_question_imports (id, pack_question_id, quiz_question_id, quiz_id) VALUES (?, ?, ?, ?)'
      ).run(randomUUID(), pqId, newQId, quizId);

      orderIndex++;
    }

    db.prepare("UPDATE quizzes SET updated_at = datetime('now') WHERE id = ?").run(quizId);
    db.prepare('UPDATE content_packs SET times_used = times_used + 1 WHERE id = ?').run(packId);
  });

  doImport();
  return { imported: questionIds.length };
}

export function searchPacks(query: string, category?: string) {
  const db = getDb();
  const term = `%${query}%`;
  let sql = "SELECT * FROM content_packs WHERE status = 'active' AND (title LIKE ? OR description LIKE ? OR tags LIKE ? OR subject LIKE ?)";
  const params: unknown[] = [term, term, term, term];
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  sql += ' ORDER BY times_used DESC, updated_at DESC';
  const rows = db.prepare(sql).all(...params) as PackRow[];
  return rows.map(mapPack);
}
