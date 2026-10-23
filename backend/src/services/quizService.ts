import { randomUUID } from 'node:crypto';
import { getDb } from '../db/index.js';

export interface QuizRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionRow {
  id: string;
  quiz_id: string;
  type: string;
  text: string;
  image_url: string | null;
  time_limit: number;
  points: number;
  explanation: string | null;
  order_index: number;
}

export interface AnswerOptionRow {
  id: string;
  question_id: string;
  text: string;
  is_correct: number;
  order_index: number;
}

export function getAllQuizzes() {
  const db = getDb();
  return db.prepare(`
    SELECT q.*, COUNT(qu.id) as question_count
    FROM quizzes q
    LEFT JOIN questions qu ON qu.quiz_id = q.id
    GROUP BY q.id
    ORDER BY q.updated_at DESC
  `).all() as (QuizRow & { question_count: number })[];
}

export function getQuizById(id: string) {
  const db = getDb();
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(id) as QuizRow | undefined;
  if (!quiz) return null;

  const questions = db.prepare(
    'SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index'
  ).all(id) as QuestionRow[];

  const questionsWithAnswers = questions.map((q) => {
    const answers = db.prepare(
      'SELECT * FROM answer_options WHERE question_id = ? ORDER BY order_index'
    ).all(q.id) as AnswerOptionRow[];
    return { ...q, answers };
  });

  return { ...quiz, questions: questionsWithAnswers };
}

export function createQuiz(data: { title: string; description?: string; category?: string }) {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    'INSERT INTO quizzes (id, title, description, category) VALUES (?, ?, ?, ?)'
  ).run(id, data.title, data.description ?? null, data.category ?? null);
  return getQuizById(id)!;
}

export function updateQuiz(id: string, data: { title?: string; description?: string; category?: string }) {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }

  if (fields.length === 0) return getQuizById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE quizzes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getQuizById(id);
}

export function deleteQuiz(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM quizzes WHERE id = ?').run(id);
  return result.changes > 0;
}

export function duplicateQuiz(id: string) {
  const db = getDb();
  const original = getQuizById(id);
  if (!original) return null;

  const newQuizId = randomUUID();

  const doDuplicate = db.transaction(() => {
    db.prepare(
      'INSERT INTO quizzes (id, title, description, category) VALUES (?, ?, ?, ?)'
    ).run(newQuizId, `${original.title} (Copy)`, original.description, original.category);

    for (const q of original.questions) {
      const newQId = randomUUID();
      db.prepare(
        'INSERT INTO questions (id, quiz_id, type, text, image_url, time_limit, points, explanation, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(newQId, newQuizId, q.type, q.text, q.image_url, q.time_limit, q.points, q.explanation, q.order_index);

      for (const a of q.answers) {
        db.prepare(
          'INSERT INTO answer_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)'
        ).run(randomUUID(), newQId, a.text, a.is_correct, a.order_index);
      }
    }
  });

  doDuplicate();
  return getQuizById(newQuizId);
}

export function createQuestion(
  quizId: string,
  data: {
    type: string;
    text: string;
    imageUrl?: string;
    timeLimit?: number;
    points?: number;
    explanation?: string;
    answers: { text: string; isCorrect: boolean }[];
  }
) {
  const db = getDb();
  const id = randomUUID();

  const maxOrder = db.prepare(
    'SELECT COALESCE(MAX(order_index), -1) as max_order FROM questions WHERE quiz_id = ?'
  ).get(quizId) as { max_order: number };

  const doCreate = db.transaction(() => {
    db.prepare(
      'INSERT INTO questions (id, quiz_id, type, text, image_url, time_limit, points, explanation, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, quizId, data.type, data.text, data.imageUrl ?? null,
      data.timeLimit ?? 30, data.points ?? 1000, data.explanation ?? null,
      maxOrder.max_order + 1);

    data.answers.forEach((a, i) => {
      db.prepare(
        'INSERT INTO answer_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)'
      ).run(randomUUID(), id, a.text, a.isCorrect ? 1 : 0, i);
    });

    db.prepare("UPDATE quizzes SET updated_at = datetime('now') WHERE id = ?").run(quizId);
  });

  doCreate();
  return id;
}

export function updateQuestion(
  id: string,
  data: {
    text?: string;
    type?: string;
    imageUrl?: string;
    timeLimit?: number;
    points?: number;
    explanation?: string;
    answers?: { id?: string; text: string; isCorrect: boolean }[];
  }
) {
  const db = getDb();

  const doUpdate = db.transaction(() => {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.text !== undefined) { fields.push('text = ?'); values.push(data.text); }
    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (data.imageUrl !== undefined) { fields.push('image_url = ?'); values.push(data.imageUrl); }
    if (data.timeLimit !== undefined) { fields.push('time_limit = ?'); values.push(data.timeLimit); }
    if (data.points !== undefined) { fields.push('points = ?'); values.push(data.points); }
    if (data.explanation !== undefined) { fields.push('explanation = ?'); values.push(data.explanation); }

    if (fields.length > 0) {
      values.push(id);
      db.prepare(`UPDATE questions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    if (data.answers) {
      db.prepare('DELETE FROM answer_options WHERE question_id = ?').run(id);
      data.answers.forEach((a, i) => {
        db.prepare(
          'INSERT INTO answer_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)'
        ).run(a.id ?? randomUUID(), id, a.text, a.isCorrect ? 1 : 0, i);
      });
    }

    const question = db.prepare('SELECT quiz_id FROM questions WHERE id = ?').get(id) as { quiz_id: string } | undefined;
    if (question) {
      db.prepare("UPDATE quizzes SET updated_at = datetime('now') WHERE id = ?").run(question.quiz_id);
    }
  });

  doUpdate();
}

export function deleteQuestion(id: string): boolean {
  const db = getDb();
  const question = db.prepare('SELECT quiz_id FROM questions WHERE id = ?').get(id) as { quiz_id: string } | undefined;
  if (!question) return false;
  db.prepare('DELETE FROM questions WHERE id = ?').run(id);
  db.prepare("UPDATE quizzes SET updated_at = datetime('now') WHERE id = ?").run(question.quiz_id);
  return true;
}

export function reorderQuestions(quizId: string, questionIds: string[]) {
  const db = getDb();
  const doReorder = db.transaction(() => {
    questionIds.forEach((qId, index) => {
      db.prepare('UPDATE questions SET order_index = ? WHERE id = ? AND quiz_id = ?').run(index, qId, quizId);
    });
    db.prepare("UPDATE quizzes SET updated_at = datetime('now') WHERE id = ?").run(quizId);
  });
  doReorder();
}

export function validateQuizForGame(id: string): { valid: boolean; errors: string[] } {
  const quiz = getQuizById(id);
  const errors: string[] = [];

  if (!quiz) {
    return { valid: false, errors: ['Quiz not found'] };
  }

  if (quiz.questions.length === 0) {
    errors.push('Quiz must have at least one question');
  }

  quiz.questions.forEach((q, i) => {
    if (q.answers.length < 2) {
      errors.push(`Question ${i + 1} must have at least 2 answer options`);
    }
    const hasCorrect = q.answers.some((a) => a.is_correct === 1);
    if (!hasCorrect) {
      errors.push(`Question ${i + 1} must have a correct answer`);
    }
  });

  return { valid: errors.length === 0, errors };
}
