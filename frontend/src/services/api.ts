const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface QuizSummary {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnswerOption {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface Question {
  id: string;
  quizId: string;
  type: 'multiple-choice' | 'true-false';
  text: string;
  imageUrl: string | null;
  timeLimit: number;
  points: number;
  explanation: string | null;
  orderIndex: number;
  answers: AnswerOption[];
}

export interface QuizFull extends QuizSummary {
  questions: Question[];
}

export interface SessionSummary {
  id: string;
  quizId: string;
  quizTitle: string;
  pin: string;
  status: string;
  playerCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface PlayerResult {
  id: string;
  displayName: string;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  rank: number;
}

export interface QuestionStat {
  questionId: string;
  questionText: string;
  correctCount: number;
  totalCount: number;
  answerDistribution: { answerId: string; text: string; count: number; isCorrect: boolean }[];
}

export interface SessionResults {
  session: SessionSummary;
  players: PlayerResult[];
  questionStats: QuestionStat[];
}

export interface NetworkInfo {
  interfaces: { name: string; address: string }[];
  port: number;
}

export interface PackSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: 'culture' | 'stem';
  subject?: string;
  tags: string[];
  difficulty: string;
  packType: string;
  totalQuestions: number;
  timesUsed: number;
  coverImage?: string;
  gradeLevel?: string;
  curriculum?: string;
  author?: string;
  estimatedDurationMin?: number;
}

export interface PackChapter {
  id: string;
  packId: string;
  title: string;
  description?: string;
  contentText?: string;
  imageUrl?: string;
  orderIndex: number;
  chapterType: string;
}

export interface PackQuestion {
  id: string;
  packId: string;
  chapterId?: string;
  type: 'multiple-choice' | 'true-false';
  text: string;
  imageUrl?: string;
  timeLimit: number;
  points: number;
  explanation?: string;
  topic?: string;
  difficulty?: string;
  orderIndex: number;
  mathNotation: boolean;
  answers: { id: string; questionId: string; text: string; isCorrect: boolean; orderIndex: number }[];
}

export interface PackScene {
  id: string;
  packId: string;
  title: string;
  narratorText: string;
  backgroundImage?: string;
  narratorMood: string;
  audioFile?: string;
  durationSeconds?: number;
  orderIndex: number;
  questionId?: string;
}

export interface PackFull extends PackSummary {
  objectives: { id: string; packId: string; text: string; orderIndex: number }[];
  chapters: PackChapter[];
  questions: PackQuestion[];
  scenes: PackScene[];
  license: string;
  version: number;
  status: string;
  source?: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export const api = {
  getQuizzes: () => request<QuizSummary[]>('/quizzes'),

  getQuiz: (id: string) => request<QuizFull>(`/quizzes/${id}`),

  createQuiz: (data: { title: string; description?: string; category?: string }) =>
    request<QuizFull>('/quizzes', { method: 'POST', body: JSON.stringify(data) }),

  updateQuiz: (id: string, data: { title?: string; description?: string; category?: string }) =>
    request<QuizFull>(`/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteQuiz: (id: string) =>
    request<{ success: boolean }>(`/quizzes/${id}`, { method: 'DELETE' }),

  duplicateQuiz: (id: string) =>
    request<QuizFull>(`/quizzes/${id}/duplicate`, { method: 'POST' }),

  addQuestion: (quizId: string, data: {
    type: 'multiple-choice' | 'true-false';
    text: string;
    timeLimit?: number;
    points?: number;
    explanation?: string;
    answers: { text: string; isCorrect: boolean }[];
  }) =>
    request<Question>(`/quizzes/${quizId}/questions`, { method: 'POST', body: JSON.stringify(data) }),

  updateQuestion: (id: string, data: {
    text?: string;
    type?: 'multiple-choice' | 'true-false';
    timeLimit?: number;
    points?: number;
    explanation?: string;
    answers?: { id?: string; text: string; isCorrect: boolean }[];
  }) =>
    request<Question>(`/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteQuestion: (id: string) =>
    request<{ success: boolean }>(`/questions/${id}`, { method: 'DELETE' }),

  reorderQuestions: (quizId: string, questionIds: string[]) =>
    request<{ success: boolean }>(`/quizzes/${quizId}/questions/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ questionIds }),
    }),

  getSessions: () => request<SessionSummary[]>('/sessions'),

  getSessionResults: (id: string) => request<SessionResults>(`/sessions/${id}/results`),

  exportSessionCSV: async (id: string): Promise<string> => {
    const res = await fetch(`${BASE}/sessions/${id}/export`);
    if (!res.ok) throw new Error('Export failed');
    return res.text();
  },

  getNetworkInfo: () => request<NetworkInfo>('/network-info'),

  getPacks: (category?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    const qs = params.toString();
    return request<PackSummary[]>(`/packs${qs ? `?${qs}` : ''}`);
  },

  getPack: (slug: string) => request<PackFull>(`/packs/${slug}`),

  importPackQuestions: (packId: string, questionIds: string[], quizId: string) =>
    request<{ imported: number }>(`/packs/${packId}/import`, {
      method: 'POST',
      body: JSON.stringify({ questionIds, quizId }),
    }),

  exportPack: async (id: string): Promise<Blob> => {
    const res = await fetch(`${BASE}/packs/${id}/export`);
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  },

  importPackFromFile: (data: unknown) =>
    request<PackFull>('/packs/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createPack: (data: unknown) =>
    request<PackFull>('/packs/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePack: (id: string, data: unknown) =>
    request<PackFull>(`/packs/${id}/update`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  recordCompletion: (data: {
    packId: string; playerName: string; mode: string;
    score: number; totalPoints: number;
    correctAnswers: number; totalQuestions: number;
    timeTakenSeconds?: number; details?: string;
  }) => request<{ id: string }>('/analytics/completions', { method: 'POST', body: JSON.stringify(data) }),

  getPlayerStats: (name: string) => request<{
    totalCompleted: number; averageScore: number;
    topicBreakdown: { topic: string; correct: number; total: number; percentage: number }[];
  }>(`/analytics/player/${encodeURIComponent(name)}`),

  getPackLeaderboard: (packId: string) => request<{
    entries: { playerName: string; score: number; totalPoints: number; completedAt: string }[];
  }>(`/analytics/leaderboard/${packId}`),
};
