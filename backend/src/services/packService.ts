import { randomUUID } from 'node:crypto';
import { z } from 'zod';
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

export function exportPack(id: string) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM content_packs WHERE id = ?').get(id) as PackRow | undefined;
  if (!row) return null;

  const full = getFullPack(row);

  const chapterIdToIndex = new Map<string, number>();
  full.chapters.forEach((c, i) => chapterIdToIndex.set(c.id, i));

  const questionIdToIndex = new Map<string, number>();
  full.questions.forEach((q, i) => questionIdToIndex.set(q.id, i));

  return {
    formatVersion: 1,
    pack: {
      slug: full.slug,
      title: full.title,
      description: full.description,
      category: full.category,
      subject: full.subject,
      tags: full.tags,
      difficulty: full.difficulty,
      gradeLevel: full.gradeLevel,
      curriculum: full.curriculum,
      author: full.author,
      source: full.source,
      sourceUrl: full.sourceUrl,
      license: full.license,
      coverImage: full.coverImage,
      packType: full.packType,
      estimatedDurationMin: full.estimatedDurationMin,
      objectives: full.objectives.map(o => ({
        text: o.text,
        orderIndex: o.orderIndex,
      })),
      chapters: full.chapters.map(c => ({
        title: c.title,
        description: c.description,
        contentText: c.contentText,
        imageUrl: c.imageUrl,
        orderIndex: c.orderIndex,
        chapterType: c.chapterType,
      })),
      questions: full.questions.map(q => ({
        chapterIndex: q.chapterId ? chapterIdToIndex.get(q.chapterId) ?? null : null,
        type: q.type,
        text: q.text,
        imageUrl: q.imageUrl,
        timeLimit: q.timeLimit,
        points: q.points,
        explanation: q.explanation,
        topic: q.topic,
        difficulty: q.difficulty,
        orderIndex: q.orderIndex,
        mathNotation: q.mathNotation,
        answers: q.answers.map(a => ({
          text: a.text,
          isCorrect: a.isCorrect,
          orderIndex: a.orderIndex,
        })),
      })),
      scenes: full.scenes.map(s => ({
        title: s.title,
        narratorText: s.narratorText,
        backgroundImage: s.backgroundImage,
        narratorMood: s.narratorMood,
        audioFile: s.audioFile,
        durationSeconds: s.durationSeconds,
        orderIndex: s.orderIndex,
        questionIndex: s.questionId ? questionIdToIndex.get(s.questionId) ?? null : null,
      })),
    },
  };
}

const importAnswerSchema = z.object({
  text: z.string().min(1).max(1000),
  isCorrect: z.boolean(),
  orderIndex: z.number().int().min(0),
});

const importQuestionSchema = z.object({
  chapterIndex: z.number().int().min(0).nullable().optional().default(null),
  type: z.enum(['multiple-choice', 'true-false']),
  text: z.string().min(1).max(5000),
  imageUrl: z.string().max(2000).nullable().optional().default(null),
  timeLimit: z.number().int().min(5).max(300).default(30),
  points: z.number().int().min(0).max(1000).default(10),
  explanation: z.string().max(2000).nullable().optional().default(null),
  topic: z.string().max(200).nullable().optional().default(null),
  difficulty: z.enum(['easy', 'medium', 'hard']).nullable().optional().default(null),
  orderIndex: z.number().int().min(0),
  mathNotation: z.boolean().default(false),
  answers: z.array(importAnswerSchema).min(1).max(10),
});

const importSceneSchema = z.object({
  title: z.string().min(1).max(500),
  narratorText: z.string().min(1).max(5000),
  backgroundImage: z.string().max(2000).nullable().optional().default(null),
  narratorMood: z.enum(['neutral', 'happy', 'thinking', 'excited', 'serious']).default('neutral'),
  audioFile: z.string().max(2000).nullable().optional().default(null),
  durationSeconds: z.number().int().min(0).nullable().optional().default(null),
  orderIndex: z.number().int().min(0),
  questionIndex: z.number().int().min(0).nullable().optional().default(null),
});

const importPackSchema = z.object({
  formatVersion: z.literal(1),
  pack: z.object({
    slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1).max(500),
    description: z.string().max(2000).default(''),
    category: z.enum(['culture', 'stem']),
    subject: z.string().max(200).nullable().optional().default(null),
    tags: z.array(z.string().max(100)).max(20).default([]),
    difficulty: z.string().max(50).nullable().optional().default('mixed'),
    gradeLevel: z.string().max(50).nullable().optional().default(null),
    curriculum: z.string().max(200).nullable().optional().default(null),
    author: z.string().max(200).nullable().optional().default(null),
    source: z.string().max(500).nullable().optional().default(null),
    sourceUrl: z.string().max(2000).nullable().optional().default(null),
    license: z.string().max(200).default('CC-BY-4.0'),
    coverImage: z.string().max(2000).nullable().optional().default(null),
    packType: z.enum(['standard', 'narrative', 'exam']).default('standard'),
    estimatedDurationMin: z.number().int().min(0).nullable().optional().default(null),
    objectives: z.array(z.object({
      text: z.string().min(1).max(1000),
      orderIndex: z.number().int().min(0),
    })).max(50).default([]),
    chapters: z.array(z.object({
      title: z.string().min(1).max(500),
      description: z.string().max(2000).nullable().optional().default(null),
      contentText: z.string().max(50000).nullable().optional().default(null),
      imageUrl: z.string().max(2000).nullable().optional().default(null),
      orderIndex: z.number().int().min(0),
      chapterType: z.enum(['intro', 'content', 'summary', 'exam']).default('content'),
    })).max(100).default([]),
    questions: z.array(importQuestionSchema).max(500).default([]),
    scenes: z.array(importSceneSchema).max(200).default([]),
  }),
});

function generateUniqueSlug(baseSlug: string): string {
  const db = getDb();
  const exists = (s: string) =>
    db.prepare('SELECT 1 FROM content_packs WHERE slug = ?').get(s) != null;

  if (!exists(baseSlug)) return baseSlug;

  let suffix = 2;
  while (exists(`${baseSlug}-${suffix}`)) suffix++;
  return `${baseSlug}-${suffix}`;
}

export function importPack(data: unknown) {
  const parsed = importPackSchema.parse(data);
  const p = parsed.pack;
  const db = getDb();

  const packId = randomUUID();
  const slug = generateUniqueSlug(p.slug);

  const chapterIds: string[] = [];
  const questionIds: string[] = [];

  const doImport = db.transaction(() => {
    db.prepare(`INSERT INTO content_packs (
      id, slug, title, description, category, subject, tags, difficulty,
      grade_level, curriculum, author, source, source_url, license, version,
      cover_image, status, pack_type, estimated_duration_min, total_questions, times_used
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'active', ?, ?, ?, 0)`).run(
      packId, slug, p.title, p.description, p.category,
      p.subject, JSON.stringify(p.tags), p.difficulty,
      p.gradeLevel, p.curriculum, p.author, p.source, p.sourceUrl,
      p.license, p.coverImage, p.packType,
      p.estimatedDurationMin, p.questions.length,
    );

    for (const obj of p.objectives) {
      db.prepare(
        'INSERT INTO pack_objectives (id, pack_id, text, order_index) VALUES (?, ?, ?, ?)'
      ).run(randomUUID(), packId, obj.text, obj.orderIndex);
    }

    for (const ch of p.chapters) {
      const chId = randomUUID();
      chapterIds.push(chId);
      db.prepare(
        'INSERT INTO pack_chapters (id, pack_id, title, description, content_text, image_url, order_index, chapter_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(chId, packId, ch.title, ch.description, ch.contentText, ch.imageUrl, ch.orderIndex, ch.chapterType);
    }

    for (const q of p.questions) {
      const qId = randomUUID();
      questionIds.push(qId);
      const chapterId = q.chapterIndex != null && q.chapterIndex < chapterIds.length
        ? chapterIds[q.chapterIndex] : null;

      db.prepare(
        'INSERT INTO pack_questions (id, pack_id, chapter_id, type, text, image_url, time_limit, points, explanation, topic, difficulty, order_index, math_notation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(qId, packId, chapterId, q.type, q.text, q.imageUrl, q.timeLimit, q.points, q.explanation, q.topic, q.difficulty, q.orderIndex, q.mathNotation ? 1 : 0);

      for (const a of q.answers) {
        db.prepare(
          'INSERT INTO pack_answer_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)'
        ).run(randomUUID(), qId, a.text, a.isCorrect ? 1 : 0, a.orderIndex);
      }
    }

    for (const s of p.scenes) {
      const questionId = s.questionIndex != null && s.questionIndex < questionIds.length
        ? questionIds[s.questionIndex] : null;

      db.prepare(
        'INSERT INTO pack_scenes (id, pack_id, title, narrator_text, background_image, narrator_mood, audio_file, duration_seconds, order_index, question_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(randomUUID(), packId, s.title, s.narratorText, s.backgroundImage, s.narratorMood, s.audioFile, s.durationSeconds, s.orderIndex, questionId);
    }
  });

  doImport();

  return getPackById(packId);
}

const createPackAnswerSchema = z.object({
  text: z.string().min(1).max(1000),
  isCorrect: z.boolean(),
});

const createPackSceneSchema = z.object({
  title: z.string().min(1).max(500),
  narratorText: z.string().min(1).max(5000),
  narratorMood: z.enum(['neutral', 'happy', 'thinking', 'excited', 'serious']).default('neutral'),
  question: z.object({
    text: z.string().min(1).max(5000),
    type: z.enum(['multiple-choice', 'true-false']).default('multiple-choice'),
    timeLimit: z.number().int().min(5).max(300).default(20),
    points: z.number().int().min(0).max(10000).default(1000),
    explanation: z.string().max(2000).optional(),
    answers: z.array(createPackAnswerSchema).min(2).max(6),
  }).optional(),
});

const createPackSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).default(''),
  category: z.enum(['culture', 'stem']),
  subject: z.string().max(200).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'mixed']).default('intermediate'),
  gradeLevel: z.string().max(50).optional(),
  tags: z.string().max(500).optional(),
  objectives: z.array(z.string().min(1).max(1000)).max(20).default([]),
  scenes: z.array(createPackSceneSchema).min(1).max(200),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200) || 'untitled';
}

export function createPack(data: unknown) {
  const parsed = createPackSchema.parse(data);
  const db = getDb();
  const packId = randomUUID();
  const baseSlug = slugify(parsed.title);
  const slug = generateUniqueSlug(baseSlug);

  const tags = parsed.tags
    ? parsed.tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  let totalQuestions = 0;
  for (const scene of parsed.scenes) {
    if (scene.question) totalQuestions++;
  }

  const estimatedDuration = Math.max(5, parsed.scenes.length * 2 + totalQuestions * 1);

  const doCreate = db.transaction(() => {
    db.prepare(`INSERT INTO content_packs (
      id, slug, title, description, category, subject, tags, difficulty,
      grade_level, curriculum, author, source, license, version,
      status, pack_type, estimated_duration_min, total_questions, times_used
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'active', 'narrative', ?, ?, 0)`).run(
      packId, slug, parsed.title, parsed.description, parsed.category,
      parsed.subject ?? null, JSON.stringify(tags), parsed.difficulty,
      parsed.gradeLevel ?? null, null, 'Teacher-created', 'User content',
      'original', estimatedDuration, totalQuestions,
    );

    for (let i = 0; i < parsed.objectives.length; i++) {
      db.prepare(
        'INSERT INTO pack_objectives (id, pack_id, text, order_index) VALUES (?, ?, ?, ?)'
      ).run(randomUUID(), packId, parsed.objectives[i], i);
    }

    for (let i = 0; i < parsed.scenes.length; i++) {
      const scene = parsed.scenes[i];
      let questionId: string | null = null;

      if (scene.question) {
        questionId = randomUUID();
        db.prepare(
          'INSERT INTO pack_questions (id, pack_id, chapter_id, type, text, time_limit, points, explanation, topic, difficulty, order_index, math_notation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)'
        ).run(
          questionId, packId, null, scene.question.type, scene.question.text,
          scene.question.timeLimit, scene.question.points,
          scene.question.explanation ?? null, null, null, i,
        );

        for (let j = 0; j < scene.question.answers.length; j++) {
          db.prepare(
            'INSERT INTO pack_answer_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)'
          ).run(randomUUID(), questionId, scene.question.answers[j].text, scene.question.answers[j].isCorrect ? 1 : 0, j);
        }
      }

      db.prepare(
        'INSERT INTO pack_scenes (id, pack_id, title, narrator_text, narrator_mood, order_index, question_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(randomUUID(), packId, scene.title, scene.narratorText, scene.narratorMood, i, questionId);
    }
  });

  doCreate();
  return getPackById(packId);
}

export function updatePack(id: string, data: unknown) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM content_packs WHERE id = ?').get(id) as PackRow | undefined;
  if (!existing) return null;

  const parsed = createPackSchema.parse(data);

  const tags = parsed.tags
    ? parsed.tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  let totalQuestions = 0;
  for (const scene of parsed.scenes) {
    if (scene.question) totalQuestions++;
  }

  const estimatedDuration = Math.max(5, parsed.scenes.length * 2 + totalQuestions * 1);

  const doUpdate = db.transaction(() => {
    db.prepare(`UPDATE content_packs SET
      title = ?, description = ?, category = ?, subject = ?, tags = ?, difficulty = ?,
      grade_level = ?, estimated_duration_min = ?, total_questions = ?,
      updated_at = datetime('now')
      WHERE id = ?`).run(
      parsed.title, parsed.description, parsed.category,
      parsed.subject ?? null, JSON.stringify(tags), parsed.difficulty,
      parsed.gradeLevel ?? null, estimatedDuration, totalQuestions, id,
    );

    db.prepare('DELETE FROM pack_objectives WHERE pack_id = ?').run(id);
    db.prepare('DELETE FROM pack_scenes WHERE pack_id = ?').run(id);
    db.prepare('DELETE FROM pack_answer_options WHERE question_id IN (SELECT id FROM pack_questions WHERE pack_id = ?)').run(id);
    db.prepare('DELETE FROM pack_questions WHERE pack_id = ?').run(id);

    for (let i = 0; i < parsed.objectives.length; i++) {
      db.prepare(
        'INSERT INTO pack_objectives (id, pack_id, text, order_index) VALUES (?, ?, ?, ?)'
      ).run(randomUUID(), id, parsed.objectives[i], i);
    }

    for (let i = 0; i < parsed.scenes.length; i++) {
      const scene = parsed.scenes[i];
      let questionId: string | null = null;

      if (scene.question) {
        questionId = randomUUID();
        db.prepare(
          'INSERT INTO pack_questions (id, pack_id, chapter_id, type, text, time_limit, points, explanation, topic, difficulty, order_index, math_notation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)'
        ).run(
          questionId, id, null, scene.question.type, scene.question.text,
          scene.question.timeLimit, scene.question.points,
          scene.question.explanation ?? null, null, null, i,
        );

        for (let j = 0; j < scene.question.answers.length; j++) {
          db.prepare(
            'INSERT INTO pack_answer_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)'
          ).run(randomUUID(), questionId, scene.question.answers[j].text, scene.question.answers[j].isCorrect ? 1 : 0, j);
        }
      }

      db.prepare(
        'INSERT INTO pack_scenes (id, pack_id, title, narrator_text, narrator_mood, order_index, question_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(randomUUID(), id, scene.title, scene.narratorText, scene.narratorMood, i, questionId);
    }
  });

  doUpdate();
  return getPackById(id);
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
