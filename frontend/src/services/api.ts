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
};
