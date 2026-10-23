import { z } from 'zod';

export const answerOptionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, 'Answer text is required').max(500),
  isCorrect: z.boolean(),
  orderIndex: z.number().int().min(0),
});

export const questionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['multiple-choice', 'true-false']),
  text: z.string().min(1, 'Question text is required').max(1000),
  imageUrl: z.string().max(500).optional(),
  timeLimit: z.number().int().min(5).max(120).default(30),
  points: z.number().int().min(100).max(5000).default(1000),
  explanation: z.string().max(1000).optional(),
  orderIndex: z.number().int().min(0),
  answers: z.array(answerOptionSchema).min(2).max(6),
}).refine(
  (q) => q.answers.some((a) => a.isCorrect),
  { message: 'At least one answer must be marked correct' }
).refine(
  (q) => {
    if (q.type === 'true-false') return q.answers.length === 2;
    return q.answers.length >= 2;
  },
  { message: 'True/false questions must have exactly 2 answers' }
);

export const quizSchema = z.object({
  title: z.string().min(1, 'Quiz title is required').max(200),
  description: z.string().max(1000).default(''),
  category: z.string().max(100).default(''),
  questions: z.array(questionSchema).min(1, 'At least one question is required'),
});

export const gameSettingsSchema = z.object({
  questionTimer: z.boolean().default(true),
  speedScoring: z.boolean().default(true),
  showLeaderboard: z.enum(['after-each', 'end-only', 'never']).default('after-each'),
  randomizeQuestions: z.boolean().default(false),
  randomizeAnswers: z.boolean().default(false),
  showExplanations: z.boolean().default(true),
  allowLateJoin: z.boolean().default(false),
  maxPlayers: z.number().int().min(1).max(200).default(100),
  minPlayers: z.number().int().min(1).max(200).default(1),
});

export const joinGameSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'Game PIN must be 6 digits'),
  displayName: z.string()
    .trim()
    .min(1, 'Display name is required')
    .max(20, 'Display name must be 20 characters or less')
    .regex(/^[a-zA-Z0-9 _-]+$/, 'Display name can only contain letters, numbers, spaces, hyphens, and underscores'),
});

export const submitAnswerSchema = z.object({
  sessionId: z.string().min(1),
  questionId: z.string().min(1),
  answerId: z.string().min(1),
});

export type QuizInput = z.infer<typeof quizSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type AnswerOptionInput = z.infer<typeof answerOptionSchema>;
export type GameSettingsInput = z.infer<typeof gameSettingsSchema>;
export type JoinGameInput = z.infer<typeof joinGameSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
