import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import { socket } from '../services/socket';

export type SessionState = 'WAITING' | 'STARTING' | 'QUESTION_ACTIVE' | 'ANSWER_REVEAL' | 'LEADERBOARD' | 'FINISHED';

export interface Player {
  id: string;
  displayName: string;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  isConnected: boolean;
}

export interface QuestionData {
  id: string;
  text: string;
  type: 'multiple-choice' | 'true-false';
  imageUrl?: string | null;
  timeLimit: number;
  points: number;
  answers: { id: string; text: string; isCorrect?: boolean }[];
  questionIndex: number;
  totalQuestions: number;
  explanation?: string | null;
}

export interface AnswerResult {
  answerId: string;
  isCorrect: boolean;
  pointsEarned: number;
  totalScore: number;
  rank: number;
}

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  score: number;
  correctAnswers: number;
  rank: number;
  previousRank?: number;
}

export interface AnswerDistribution {
  answerId: string;
  text: string;
  count: number;
  isCorrect: boolean;
}

export interface GameState {
  sessionId: string | null;
  pin: string | null;
  quizTitle: string | null;
  state: SessionState;
  players: Player[];
  currentQuestion: QuestionData | null;
  timeRemaining: number;
  answerCount: number;
  myAnswer: AnswerResult | null;
  leaderboard: LeaderboardEntry[];
  answerDistribution: AnswerDistribution[];
  playerId: string | null;
  playerName: string | null;
  isHost: boolean;
  error: string | null;
}

type GameAction =
  | { type: 'SET_SESSION'; sessionId: string; pin: string; quizTitle: string; isHost: boolean }
  | { type: 'SET_PLAYER_INFO'; playerId: string; playerName: string }
  | { type: 'SET_STATE'; state: SessionState }
  | { type: 'SET_PLAYERS'; players: Player[] }
  | { type: 'SET_QUESTION'; question: QuestionData }
  | { type: 'SET_TIME'; time: number }
  | { type: 'SET_ANSWER_COUNT'; count: number }
  | { type: 'SET_MY_ANSWER'; result: AnswerResult }
  | { type: 'SET_LEADERBOARD'; entries: LeaderboardEntry[] }
  | { type: 'SET_ANSWER_DISTRIBUTION'; distribution: AnswerDistribution[] }
  | { type: 'SET_CORRECT_ANSWERS'; answers: { id: string; text: string; isCorrect: boolean }[] }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

const initialState: GameState = {
  sessionId: null,
  pin: null,
  quizTitle: null,
  state: 'WAITING',
  players: [],
  currentQuestion: null,
  timeRemaining: 0,
  answerCount: 0,
  myAnswer: null,
  leaderboard: [],
  answerDistribution: [],
  playerId: null,
  playerName: null,
  isHost: false,
  error: null,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_SESSION':
      return { ...state, sessionId: action.sessionId, pin: action.pin, quizTitle: action.quizTitle, isHost: action.isHost };
    case 'SET_PLAYER_INFO':
      return { ...state, playerId: action.playerId, playerName: action.playerName };
    case 'SET_STATE':
      return { ...state, state: action.state, myAnswer: action.state === 'QUESTION_ACTIVE' ? null : state.myAnswer, answerCount: action.state === 'QUESTION_ACTIVE' ? 0 : state.answerCount, answerDistribution: action.state === 'QUESTION_ACTIVE' ? [] : state.answerDistribution };
    case 'SET_PLAYERS':
      return { ...state, players: action.players };
    case 'SET_QUESTION':
      return { ...state, currentQuestion: action.question, myAnswer: null, answerCount: 0, answerDistribution: [] };
    case 'SET_TIME':
      return { ...state, timeRemaining: action.time };
    case 'SET_ANSWER_COUNT':
      return { ...state, answerCount: action.count };
    case 'SET_MY_ANSWER':
      return { ...state, myAnswer: action.result };
    case 'SET_LEADERBOARD':
      return { ...state, leaderboard: action.entries };
    case 'SET_ANSWER_DISTRIBUTION':
      return { ...state, answerDistribution: action.distribution };
    case 'SET_CORRECT_ANSWERS':
      if (!state.currentQuestion) return state;
      return { ...state, currentQuestion: { ...state.currentQuestion, answers: action.answers } };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface GameContextType {
  game: GameState;
  dispatch: React.Dispatch<GameAction>;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    const onPlayersUpdated = (data: { players: Player[] }) => {
      dispatch({ type: 'SET_PLAYERS', players: data.players });
    };

    const onStateChanged = (data: { state: SessionState }) => {
      dispatch({ type: 'SET_STATE', state: data.state });
    };

    const onQuestionStarted = (data: { question: QuestionData; timeLimit: number }) => {
      dispatch({ type: 'SET_QUESTION', question: data.question });
      dispatch({ type: 'SET_STATE', state: 'QUESTION_ACTIVE' });
      dispatch({ type: 'SET_TIME', time: data.timeLimit });
    };

    const onTimerTick = (data: { timeRemaining: number }) => {
      dispatch({ type: 'SET_TIME', time: data.timeRemaining });
    };

    const onAnswerAccepted = (data: AnswerResult) => {
      dispatch({ type: 'SET_MY_ANSWER', result: data });
    };

    const onAnswerCount = (data: { count: number }) => {
      dispatch({ type: 'SET_ANSWER_COUNT', count: data.count });
    };

    const onAnswerReveal = (data: { correctAnswers: { id: string; text: string; isCorrect: boolean }[]; distribution: AnswerDistribution[]; explanation?: string | null }) => {
      dispatch({ type: 'SET_STATE', state: 'ANSWER_REVEAL' });
      dispatch({ type: 'SET_CORRECT_ANSWERS', answers: data.correctAnswers });
      dispatch({ type: 'SET_ANSWER_DISTRIBUTION', distribution: data.distribution });
      if (data.explanation && game.currentQuestion) {
        dispatch({ type: 'SET_QUESTION', question: { ...game.currentQuestion, explanation: data.explanation } });
      }
    };

    const onLeaderboard = (data: { leaderboard: LeaderboardEntry[] }) => {
      dispatch({ type: 'SET_LEADERBOARD', entries: data.leaderboard });
      dispatch({ type: 'SET_STATE', state: 'LEADERBOARD' });
    };

    const onGameFinished = (data: { leaderboard: LeaderboardEntry[] }) => {
      dispatch({ type: 'SET_LEADERBOARD', entries: data.leaderboard });
      dispatch({ type: 'SET_STATE', state: 'FINISHED' });
    };

    const onError = (data: { message: string }) => {
      dispatch({ type: 'SET_ERROR', error: data.message });
    };

    socket.on('session:players-updated', onPlayersUpdated);
    socket.on('session:state', onStateChanged);
    socket.on('game:question-started', onQuestionStarted);
    socket.on('game:timer-tick', onTimerTick);
    socket.on('game:answer-accepted', onAnswerAccepted);
    socket.on('game:answer-count', onAnswerCount);
    socket.on('game:answer-reveal', onAnswerReveal);
    socket.on('game:leaderboard', onLeaderboard);
    socket.on('game:finished', onGameFinished);
    socket.on('game:error', onError);

    return () => {
      socket.off('session:players-updated', onPlayersUpdated);
      socket.off('session:state', onStateChanged);
      socket.off('game:question-started', onQuestionStarted);
      socket.off('game:timer-tick', onTimerTick);
      socket.off('game:answer-accepted', onAnswerAccepted);
      socket.off('game:answer-count', onAnswerCount);
      socket.off('game:answer-reveal', onAnswerReveal);
      socket.off('game:leaderboard', onLeaderboard);
      socket.off('game:finished', onGameFinished);
      socket.off('game:error', onError);
    };
  }, [game.currentQuestion]);

  return (
    <GameContext.Provider value={{ game, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
