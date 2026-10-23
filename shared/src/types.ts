// ============================================================
// Domain Types
// ============================================================

export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizWithQuestions extends Quiz {
  questions: QuestionWithAnswers[];
}

export type QuestionType = 'multiple-choice' | 'true-false';

export interface Question {
  id: string;
  quizId: string;
  type: QuestionType;
  text: string;
  imageUrl?: string;
  timeLimit: number;
  points: number;
  explanation?: string;
  orderIndex: number;
}

export interface QuestionWithAnswers extends Question {
  answers: AnswerOption[];
}

export interface AnswerOption {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  orderIndex: number;
}

// ============================================================
// Game Session
// ============================================================

export enum SessionState {
  WAITING = 'WAITING',
  STARTING = 'STARTING',
  QUESTION_ACTIVE = 'QUESTION_ACTIVE',
  ANSWER_REVEAL = 'ANSWER_REVEAL',
  LEADERBOARD = 'LEADERBOARD',
  FINISHED = 'FINISHED',
}

export interface GameSession {
  id: string;
  quizId: string;
  pin: string;
  hostSocketId: string;
  state: SessionState;
  currentQuestionIndex: number;
  settings: GameSettings;
  createdAt: string;
  finishedAt?: string;
}

export interface GameSettings {
  questionTimer: boolean;
  speedScoring: boolean;
  showLeaderboard: 'after-each' | 'end-only' | 'never';
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  showExplanations: boolean;
  allowLateJoin: boolean;
  maxPlayers: number;
  minPlayers: number;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  questionTimer: true,
  speedScoring: true,
  showLeaderboard: 'after-each',
  randomizeQuestions: false,
  randomizeAnswers: false,
  showExplanations: true,
  allowLateJoin: false,
  maxPlayers: 100,
  minPlayers: 1,
};

// ============================================================
// Players and Responses
// ============================================================

export interface SessionPlayer {
  id: string;
  sessionId: string;
  displayName: string;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  isConnected: boolean;
  joinedAt: string;
}

export interface QuestionResponse {
  id: string;
  sessionId: string;
  playerId: string;
  questionId: string;
  answerId: string | null;
  isCorrect: boolean;
  points: number;
  responseTime: number;
  submittedAt: string;
}

// ============================================================
// Game State (sent to clients)
// ============================================================

export interface HostGameState {
  sessionId: string;
  pin: string;
  state: SessionState;
  quizTitle: string;
  players: SessionPlayer[];
  currentQuestion?: HostQuestionView;
  currentQuestionIndex: number;
  totalQuestions: number;
  answerCounts: Record<string, number>;
  totalSubmissions: number;
  leaderboard: LeaderboardEntry[];
  settings: GameSettings;
}

export interface HostQuestionView {
  id: string;
  type: QuestionType;
  text: string;
  imageUrl?: string;
  timeLimit: number;
  points: number;
  explanation?: string;
  answers: AnswerOption[];
  questionNumber: number;
  totalQuestions: number;
}

export interface PlayerGameState {
  sessionId: string;
  state: SessionState;
  quizTitle: string;
  playerCount: number;
  currentQuestion?: PlayerQuestionView;
  currentQuestionIndex: number;
  totalQuestions: number;
  myScore: number;
  myRank: number;
  hasAnswered: boolean;
  lastAnswerCorrect?: boolean;
  lastAnswerPoints?: number;
  leaderboard: LeaderboardEntry[];
}

export interface PlayerQuestionView {
  id: string;
  type: QuestionType;
  text: string;
  imageUrl?: string;
  timeLimit: number;
  points: number;
  answers: PlayerAnswerView[];
  questionNumber: number;
  totalQuestions: number;
}

export interface PlayerAnswerView {
  id: string;
  text: string;
  orderIndex: number;
}

export interface RevealedAnswer extends PlayerAnswerView {
  isCorrect: boolean;
}

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  rank: number;
  previousRank?: number;
}

// ============================================================
// Scoring
// ============================================================

export interface ScoreCalculation {
  points: number;
  isCorrect: boolean;
  responseTime: number;
  maxTime: number;
  speedBonus: boolean;
}

export function calculateScore(params: ScoreCalculation): number {
  if (!params.isCorrect) return 0;
  if (!params.speedBonus) return params.points;
  const remainingTime = Math.max(0, params.maxTime - params.responseTime);
  return Math.round(params.points * (0.5 + 0.5 * remainingTime / params.maxTime));
}

// ============================================================
// Socket.IO Event Types
// ============================================================

export interface ClientToServerEvents {
  'host:create-session': (data: CreateSessionData, callback: (response: CreateSessionResponse) => void) => void;
  'host:start-game': (data: { sessionId: string }) => void;
  'host:next-question': (data: { sessionId: string }) => void;
  'host:end-game': (data: { sessionId: string }) => void;
  'host:remove-player': (data: { sessionId: string; playerId: string }) => void;
  'host:show-leaderboard': (data: { sessionId: string }) => void;
  'player:join-session': (data: JoinSessionData, callback: (response: JoinSessionResponse) => void) => void;
  'player:submit-answer': (data: SubmitAnswerData, callback: (response: SubmitAnswerResponse) => void) => void;
  'player:leave-session': (data: { sessionId: string }) => void;
}

export interface ServerToClientEvents {
  'session:state': (state: HostGameState | PlayerGameState) => void;
  'session:players-updated': (players: SessionPlayer[]) => void;
  'session:error': (error: { message: string; code: string }) => void;
  'game:question-started': (question: HostQuestionView | PlayerQuestionView) => void;
  'game:timer-tick': (data: { remaining: number; total: number }) => void;
  'game:answer-accepted': (data: { playerId: string; submissionCount: number }) => void;
  'game:answer-reveal': (data: AnswerRevealData) => void;
  'game:leaderboard-updated': (leaderboard: LeaderboardEntry[]) => void;
  'game:finished': (data: GameFinishedData) => void;
  'player:kicked': (data: { reason: string }) => void;
  'player:answer-result': (data: { isCorrect: boolean; points: number; correctAnswerId: string }) => void;
}

// ============================================================
// Event Payload Types
// ============================================================

export interface CreateSessionData {
  quizId: string;
  settings: GameSettings;
}

export interface CreateSessionResponse {
  success: boolean;
  sessionId?: string;
  pin?: string;
  error?: string;
}

export interface JoinSessionData {
  pin: string;
  displayName: string;
}

export interface JoinSessionResponse {
  success: boolean;
  sessionId?: string;
  playerId?: string;
  quizTitle?: string;
  error?: string;
}

export interface SubmitAnswerData {
  sessionId: string;
  questionId: string;
  answerId: string;
}

export interface SubmitAnswerResponse {
  success: boolean;
  error?: string;
}

export interface AnswerRevealData {
  questionId: string;
  correctAnswerId: string;
  answers: RevealedAnswer[];
  explanation?: string;
  answerCounts: Record<string, number>;
}

export interface GameFinishedData {
  finalLeaderboard: LeaderboardEntry[];
  totalQuestions: number;
  sessionId: string;
}

// ============================================================
// API Types
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GameHistoryEntry {
  id: string;
  quizTitle: string;
  pin: string;
  playerCount: number;
  createdAt: string;
  finishedAt: string;
  winner?: string;
}

export interface GameResultDetail {
  session: GameSession;
  quizTitle: string;
  players: SessionPlayer[];
  responses: QuestionResponse[];
  questions: QuestionWithAnswers[];
}
