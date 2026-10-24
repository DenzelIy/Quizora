import type { Server, Socket } from 'socket.io';
import * as quizService from '../services/quizService.js';
import * as sessionService from '../services/sessionService.js';
import * as scoringService from '../services/scoringService.js';

interface AnswerOption {
  id: string;
  text: string;
  isCorrect: boolean;
  orderIndex: number;
}

interface Question {
  id: string;
  quizId: string;
  type: string;
  text: string;
  imageUrl: string | null;
  timeLimit: number;
  points: number;
  explanation: string | null;
  orderIndex: number;
  answers: AnswerOption[];
}

interface GameSettings {
  questionTimer: boolean;
  speedScoring: boolean;
  showLeaderboard: 'after-each' | 'end-only' | 'never';
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  showExplanations: boolean;
  allowLateJoin: boolean;
  maxPlayers: number;
  minPlayers: number;
  autoAdvance: boolean;
  autoAdvanceSeconds: number;
}

type SessionState = 'WAITING' | 'STARTING' | 'QUESTION_ACTIVE' | 'ANSWER_REVEAL' | 'LEADERBOARD' | 'FINISHED';

interface PlayerState {
  id: string;
  displayName: string;
  socketId: string | null;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  isConnected: boolean;
  avatar: string;
}

interface ActiveGame {
  sessionId: string;
  quizId: string;
  pin: string;
  hostSocketId: string;
  settings: GameSettings;
  state: SessionState;
  currentQuestionIndex: number;
  questions: Question[];
  players: Map<string, PlayerState>;
  questionStartTime: number | null;
  questionTimer: ReturnType<typeof setTimeout> | null;
  advanceTimer: ReturnType<typeof setTimeout> | null;
  answersReceived: Set<string>;
  questionResults: Map<string, { isCorrect: boolean; points: number }>;
  /** Rank and score at the last scoreboard, used to animate who moved up or down. */
  lastStanding: Map<string, { rank: number; score: number }>;
  hostDisconnectTimer: ReturnType<typeof setTimeout> | null;
}

const activeGames = new Map<string, ActiveGame>();
const pinToSession = new Map<string, string>();
const socketToSession = new Map<string, { sessionId: string; playerId?: string; isHost: boolean }>();

/** How long each question is shown on its own before answers open. */
const QUESTION_INTRO_MS = 4000;

const DEFAULT_SETTINGS: GameSettings = {
  questionTimer: true,
  speedScoring: true,
  showLeaderboard: 'after-each',
  randomizeQuestions: false,
  randomizeAnswers: false,
  showExplanations: true,
  allowLateJoin: false,
  maxPlayers: 100,
  minPlayers: 1,
  autoAdvance: true,
  autoAdvanceSeconds: 5,
};

const DEFAULT_AVATAR = '🦁';

/** Avatars are emoji characters chosen on the join screen; accept any short emoji-like string. */
function sanitizeAvatar(avatar: unknown): string {
  if (typeof avatar !== 'string') return DEFAULT_AVATAR;
  const trimmed = avatar.trim();
  if (!trimmed || trimmed.length > 16 || /[<>\w\s]/.test(trimmed)) return DEFAULT_AVATAR;
  return trimmed;
}

function sanitizeName(name: unknown): string {
  if (typeof name !== 'string') return '';
  return name.trim().replace(/<[^>]*>/g, '').slice(0, 20);
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getPlayerList(game: ActiveGame) {
  return Array.from(game.players.values()).map((p) => ({
    id: p.id,
    displayName: p.displayName,
    avatar: p.avatar,
    score: p.score,
    correctAnswers: p.correctAnswers,
    totalAnswers: p.totalAnswers,
    isConnected: p.isConnected,
  }));
}

function emitPlayersUpdate(io: Server, game: ActiveGame) {
  io.to(game.sessionId).emit('session:players-updated', {
    players: getPlayerList(game),
    count: game.players.size,
  });
}

function getLeaderboardEntries(game: ActiveGame) {
  return scoringService.getLeaderboard(game.sessionId).map((e) => ({
    playerId: e.id,
    displayName: e.display_name,
    avatar: game.players.get(e.id)?.avatar ?? DEFAULT_AVATAR,
    score: e.score,
    correctAnswers: e.correct_answers,
    totalAnswers: e.total_answers,
    rank: e.rank,
  }));
}

function syncPlayerScores(game: ActiveGame, leaderboard: ReturnType<typeof getLeaderboardEntries>) {
  for (const entry of leaderboard) {
    const player = game.players.get(entry.playerId);
    if (player) {
      player.score = entry.score;
      player.correctAnswers = entry.correctAnswers;
      player.totalAnswers = entry.totalAnswers;
    }
  }
}

function buildQuestions(quiz: { questions: any[] }, settings: GameSettings): Question[] {
  let questions: Question[] = quiz.questions.map((q) => ({
    id: q.id,
    quizId: q.quiz_id,
    type: q.type,
    text: q.text,
    imageUrl: q.image_url,
    timeLimit: q.time_limit,
    points: q.points,
    explanation: q.explanation,
    orderIndex: q.order_index,
    answers: (q.answers ?? []).map((a: any) => ({
      id: a.id,
      text: a.text,
      isCorrect: a.is_correct === 1,
      orderIndex: a.order_index,
    })),
  }));

  if (settings.randomizeQuestions) {
    questions = shuffleArray(questions);
  }
  if (settings.randomizeAnswers) {
    questions = questions.map((q) => ({ ...q, answers: shuffleArray(q.answers) }));
  }
  return questions;
}

function sanitizeSettings(input: unknown): Partial<GameSettings> {
  if (!input || typeof input !== 'object') return {};
  const result: Record<string, unknown> = {};
  for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === typeof defaultValue) result[key] = value;
  }
  if (typeof result.autoAdvanceSeconds === 'number') {
    result.autoAdvanceSeconds = Math.min(60, Math.max(3, Math.round(result.autoAdvanceSeconds)));
  }
  return result as Partial<GameSettings>;
}

function clearAdvanceTimer(game: ActiveGame) {
  if (game.advanceTimer) {
    clearTimeout(game.advanceTimer);
    game.advanceTimer = null;
  }
}

/** Starts the auto-advance countdown if enabled; returns how long until it fires (null when manual). */
function scheduleAutoAdvance(io: Server, game: ActiveGame): number | null {
  clearAdvanceTimer(game);
  if (!game.settings.autoAdvance) return null;
  const delayMs = game.settings.autoAdvanceSeconds * 1000;
  game.advanceTimer = setTimeout(() => {
    game.advanceTimer = null;
    if (activeGames.get(game.sessionId) === game) advanceGame(io, game);
  }, delayMs);
  return delayMs;
}

/** Moves past the answer reveal or leaderboard: shows the leaderboard, the next question, or finishes. */
function advanceGame(io: Server, game: ActiveGame) {
  clearAdvanceTimer(game);

  if (game.state === 'ANSWER_REVEAL' && game.settings.showLeaderboard === 'after-each') {
    showLeaderboard(io, game);
    return;
  }

  game.currentQuestionIndex++;

  if (game.currentQuestionIndex >= game.questions.length) {
    if (game.settings.showLeaderboard !== 'never') {
      showLeaderboard(io, game);
      clearAdvanceTimer(game);
      setTimeout(() => finishGame(io, game), 100);
    } else {
      finishGame(io, game);
    }
    return;
  }

  sendQuestionToClients(io, game);
}

function buildQuestionPayload(game: ActiveGame) {
  const question = game.questions[game.currentQuestionIndex];
  if (!question) return null;

  const timeLimit = game.settings.questionTimer ? question.timeLimit : 0;
  const now = Date.now();
  const opensAt = game.questionStartTime ?? now;
  const elapsedMs = Math.max(0, now - opensAt);

  return {
    questionIndex: game.currentQuestionIndex,
    totalQuestions: game.questions.length,
    introMs: QUESTION_INTRO_MS,
    introRemainingMs: Math.max(0, opensAt - now),
    remainingMs: timeLimit > 0 ? Math.max(0, timeLimit * 1000 - elapsedMs) : 0,
    question: {
      id: question.id,
      type: question.type,
      text: question.text,
      imageUrl: question.imageUrl,
      timeLimit,
      points: question.points,
      answers: question.answers.map((a) => ({
        id: a.id,
        text: a.text,
        orderIndex: a.orderIndex,
      })),
    },
  };
}

function sendQuestionToClients(io: Server, game: ActiveGame) {
  const question = game.questions[game.currentQuestionIndex];
  if (!question) return;

  game.state = 'QUESTION_ACTIVE';
  // The question is shown on its own during the intro; answers open (and the clock starts) afterwards.
  game.questionStartTime = Date.now() + QUESTION_INTRO_MS;
  game.answersReceived = new Set();
  game.questionResults = new Map();
  clearAdvanceTimer(game);

  const timeLimit = game.settings.questionTimer ? question.timeLimit : 0;

  // Hosts and players are both in the session room; answers never include isCorrect.
  io.to(game.sessionId).emit('game:question-started', buildQuestionPayload(game));

  if (timeLimit > 0) {
    if (game.questionTimer) clearTimeout(game.questionTimer);
    game.questionTimer = setTimeout(() => {
      handleTimeUp(io, game);
    }, QUESTION_INTRO_MS + timeLimit * 1000 + 500);
  }
}

function handleTimeUp(io: Server, game: ActiveGame) {
  if (game.state !== 'QUESTION_ACTIVE') return;
  revealAnswer(io, game);
}

function revealAnswer(io: Server, game: ActiveGame) {
  if (game.state !== 'QUESTION_ACTIVE') return;

  game.state = 'ANSWER_REVEAL';
  if (game.questionTimer) {
    clearTimeout(game.questionTimer);
    game.questionTimer = null;
  }

  const question = game.questions[game.currentQuestionIndex];
  if (!question) return;

  const correctAnswer = question.answers.find((a) => a.isCorrect);
  const stats = scoringService.getQuestionStats(game.sessionId, question.id);
  const ranks = new Map(getLeaderboardEntries(game).map((e) => [e.playerId, e.rank]));

  // Sent before the reveal so each player's result is in place when their reveal screen renders.
  for (const player of game.players.values()) {
    if (!player.socketId || !player.isConnected) continue;
    const result = game.questionResults.get(player.id);
    io.to(player.socketId).emit('game:your-result', {
      answered: game.answersReceived.has(player.id),
      isCorrect: result?.isCorrect ?? false,
      pointsEarned: result?.points ?? 0,
      score: player.score,
      rank: ranks.get(player.id) ?? null,
    });
  }

  const revealData = {
    autoAdvanceMs: scheduleAutoAdvance(io, game),
    questionId: question.id,
    correctAnswerId: correctAnswer?.id ?? null,
    explanation: game.settings.showExplanations ? question.explanation : null,
    stats,
    playerResults: Array.from(game.players.values()).map((p) => ({
      playerId: p.id,
      displayName: p.displayName,
      answered: game.answersReceived.has(p.id),
    })),
  };

  io.to(game.sessionId).emit('game:answer-reveal', revealData);
}

function showLeaderboard(io: Server, game: ActiveGame) {
  game.state = 'LEADERBOARD';
  // Previous rank and score let the scoreboard start from the old order and animate overtakes.
  const leaderboard = getLeaderboardEntries(game).map((e) => ({
    ...e,
    previousRank: game.lastStanding.get(e.playerId)?.rank,
    previousScore: game.lastStanding.get(e.playerId)?.score ?? 0,
  }));
  syncPlayerScores(game, leaderboard);
  game.lastStanding = new Map(leaderboard.map((e) => [e.playerId, { rank: e.rank, score: e.score }]));

  io.to(game.sessionId).emit('game:leaderboard-updated', {
    autoAdvanceMs: scheduleAutoAdvance(io, game),
    leaderboard,
    questionIndex: game.currentQuestionIndex,
    totalQuestions: game.questions.length,
    isFinal: game.currentQuestionIndex >= game.questions.length - 1,
  });
}

function finishGame(io: Server, game: ActiveGame) {
  game.state = 'FINISHED';
  clearAdvanceTimer(game);
  if (game.questionTimer) {
    clearTimeout(game.questionTimer);
    game.questionTimer = null;
  }

  const leaderboard = getLeaderboardEntries(game);
  syncPlayerScores(game, leaderboard);

  sessionService.finishSession(game.sessionId);

  io.to(game.sessionId).emit('game:finished', {
    leaderboard,
    totalQuestions: game.questions.length,
  });

  pinToSession.delete(game.pin);

  for (const player of game.players.values()) {
    if (player.socketId) socketToSession.delete(player.socketId);
  }
  socketToSession.delete(game.hostSocketId);
  activeGames.delete(game.sessionId);
}

export function setupGameHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    socket.on('host:create-session', (data, callback) => {
      try {
        const { quizId, settings } = data ?? {};
        if (!quizId || typeof quizId !== 'string') {
          return callback?.({ error: 'Quiz ID is required' });
        }

        const validation = quizService.validateQuizForGame(quizId);
        if (!validation.valid) {
          return callback?.({ error: validation.errors[0] ?? 'Quiz is not valid' });
        }

        const quiz = quizService.getQuizById(quizId);
        if (!quiz) return callback?.({ error: 'Quiz not found' });

        const mergedSettings: GameSettings = { ...DEFAULT_SETTINGS, ...sanitizeSettings(settings) };
        const session = sessionService.createSession(quizId, socket.id, mergedSettings as unknown as Record<string, unknown>);
        const questions = buildQuestions(quiz, mergedSettings);

        const game: ActiveGame = {
          sessionId: session.id,
          quizId,
          pin: session.pin,
          hostSocketId: socket.id,
          settings: mergedSettings,
          state: 'WAITING',
          currentQuestionIndex: 0,
          questions,
          players: new Map(),
          questionStartTime: null,
          questionTimer: null,
          advanceTimer: null,
          answersReceived: new Set(),
          questionResults: new Map(),
          lastStanding: new Map(),
          hostDisconnectTimer: null,
        };

        activeGames.set(session.id, game);
        pinToSession.set(session.pin, session.id);
        socketToSession.set(socket.id, { sessionId: session.id, isHost: true });

        socket.join(session.id);
        socket.join(`host:${session.id}`);

        callback?.({
          success: true,
          sessionId: session.id,
          pin: session.pin,
          quizTitle: quiz.title,
          questionCount: questions.length,
        });
      } catch (err) {
        console.error('Error creating session:', err);
        callback?.({ error: 'Failed to create session' });
      }
    });

    socket.on('player:join-session', (data, callback) => {
      try {
        const { pin, displayName: rawName, avatar } = data ?? {};
        const displayName = sanitizeName(rawName);

        if (!pin || typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
          return callback?.({ error: 'Invalid game PIN' });
        }
        if (!displayName || displayName.length < 1) {
          return callback?.({ error: 'Display name is required' });
        }

        const sessionId = pinToSession.get(pin);
        if (!sessionId) return callback?.({ error: 'Game not found. Check your PIN.' });

        const game = activeGames.get(sessionId);
        if (!game) return callback?.({ error: 'Game not found' });

        if (game.state !== 'WAITING' && !(game.settings.allowLateJoin && game.state === 'QUESTION_ACTIVE')) {
          return callback?.({ error: 'This game is not accepting new players' });
        }

        if (game.players.size >= game.settings.maxPlayers) {
          return callback?.({ error: 'Game is full' });
        }

        const playerAvatar = sanitizeAvatar(avatar);
        const player = sessionService.addPlayer(sessionId, displayName, socket.id, playerAvatar);

        game.players.set(player.id, {
          id: player.id,
          displayName: player.displayName,
          socketId: socket.id,
          score: 0,
          correctAnswers: 0,
          totalAnswers: 0,
          isConnected: true,
          avatar: playerAvatar,
        });

        socketToSession.set(socket.id, { sessionId, playerId: player.id, isHost: false });
        socket.join(sessionId);

        emitPlayersUpdate(io, game);

        callback?.({
          success: true,
          playerId: player.id,
          sessionId,
          displayName: player.displayName,
          gameState: game.state,
        });
      } catch (err) {
        console.error('Error joining session:', err);
        callback?.({ error: 'Failed to join game' });
      }
    });

    socket.on('player:update-avatar', (data, callback) => {
      const info = socketToSession.get(socket.id);
      if (!info || info.isHost || !info.playerId) return callback?.({ error: 'Unauthorized' });

      const game = activeGames.get(info.sessionId);
      const player = game?.players.get(info.playerId);
      if (!game || !player) return callback?.({ error: 'Game not found' });

      player.avatar = sanitizeAvatar(data?.avatar);
      sessionService.updatePlayerAvatar(player.id, player.avatar);
      emitPlayersUpdate(io, game);
      callback?.({ success: true, avatar: player.avatar });
    });

    socket.on('player:leave-session', () => {
      const info = socketToSession.get(socket.id);
      if (!info || info.isHost || !info.playerId) return;

      const game = activeGames.get(info.sessionId);
      if (!game) return;

      const player = game.players.get(info.playerId);
      if (player) {
        player.isConnected = false;
        player.socketId = null;
        sessionService.updatePlayerConnection(info.playerId, null, false);
      }

      socket.leave(info.sessionId);
      socketToSession.delete(socket.id);
      emitPlayersUpdate(io, game);
    });

    socket.on('host:kick-player', (data, callback) => {
      const info = socketToSession.get(socket.id);
      if (!info || !info.isHost) return callback?.({ error: 'Unauthorized' });

      const game = activeGames.get(info.sessionId);
      if (!game) return callback?.({ error: 'Game not found' });

      const { playerId } = data ?? {};
      const player = game.players.get(playerId);
      if (!player) return callback?.({ error: 'Player not found' });

      if (player.socketId) {
        io.to(player.socketId).emit('player:kicked');
        const playerSocket = io.sockets.sockets.get(player.socketId);
        if (playerSocket) {
          playerSocket.leave(info.sessionId);
        }
        socketToSession.delete(player.socketId);
      }

      game.players.delete(playerId);
      sessionService.removePlayer(info.sessionId, playerId);
      emitPlayersUpdate(io, game);
      callback?.({ success: true });
    });

    socket.on('host:start-game', (data, callback) => {
      const info = socketToSession.get(socket.id);
      if (!info || !info.isHost) return callback?.({ error: 'Unauthorized' });

      const game = activeGames.get(info.sessionId);
      if (!game) return callback?.({ error: 'Game not found' });
      if (game.state !== 'WAITING') return callback?.({ error: 'Game already started' });

      // Apply settings changed in the lobby, rebuilding questions so randomization takes effect.
      if (data?.settings) {
        const quiz = quizService.getQuizById(game.quizId);
        if (!quiz) return callback?.({ error: 'Quiz not found' });
        game.settings = { ...game.settings, ...sanitizeSettings(data.settings) };
        game.questions = buildQuestions(quiz, game.settings);
      }

      const connectedCount = Array.from(game.players.values()).filter((p) => p.isConnected).length;
      if (connectedCount < game.settings.minPlayers) {
        return callback?.({ error: `Need at least ${game.settings.minPlayers} player(s)` });
      }

      if (game.questions.length === 0) {
        return callback?.({ error: 'Quiz has no questions' });
      }

      game.state = 'STARTING';
      io.to(game.sessionId).emit('game:starting', { countdown: 3 });

      setTimeout(() => {
        // The host may have ended the game during the countdown.
        if (activeGames.get(game.sessionId) !== game || game.state !== 'STARTING') return;
        game.currentQuestionIndex = 0;
        sendQuestionToClients(io, game);
      }, 3000);

      callback?.({ success: true });
    });

    socket.on('host:next-question', (_, callback) => {
      const info = socketToSession.get(socket.id);
      if (!info || !info.isHost) return callback?.({ error: 'Unauthorized' });

      const game = activeGames.get(info.sessionId);
      if (!game) return callback?.({ error: 'Game not found' });

      if (game.state !== 'ANSWER_REVEAL' && game.state !== 'LEADERBOARD') {
        return callback?.({ error: 'Cannot advance right now' });
      }

      advanceGame(io, game);
      callback?.({ success: true });
    });

    socket.on('player:submit-answer', (data, callback) => {
      const info = socketToSession.get(socket.id);
      if (!info || info.isHost || !info.playerId) {
        return callback?.({ error: 'Unauthorized' });
      }

      const game = activeGames.get(info.sessionId);
      if (!game) return callback?.({ error: 'Game not found' });

      if (game.state !== 'QUESTION_ACTIVE') {
        return callback?.({ error: 'No active question' });
      }

      if (game.answersReceived.has(info.playerId)) {
        return callback?.({ error: 'Already answered' });
      }

      const { answerId } = data ?? {};
      if (!answerId || typeof answerId !== 'string') {
        return callback?.({ error: 'Answer is required' });
      }

      const question = game.questions[game.currentQuestionIndex];
      if (!question) return callback?.({ error: 'Question not found' });

      const validAnswer = question.answers.find((a) => a.id === answerId);
      if (!validAnswer) return callback?.({ error: 'Invalid answer' });

      if (!game.questionStartTime) return callback?.({ error: 'Timer error' });

      const responseTimeMs = Date.now() - game.questionStartTime;
      if (responseTimeMs < 0) return callback?.({ error: 'Answers are not open yet' });
      const timeLimitMs = question.timeLimit * 1000;

      if (game.settings.questionTimer && responseTimeMs > timeLimitMs + 1000) {
        return callback?.({ error: 'Time is up' });
      }

      const result = scoringService.recordAnswer(
        game.sessionId,
        info.playerId,
        question.id,
        answerId,
        responseTimeMs,
        { points: question.points, time_limit: question.timeLimit },
        game.settings.speedScoring,
      );

      if (!result.accepted) {
        return callback?.({ error: 'Already answered' });
      }

      const player = game.players.get(info.playerId);
      if (player) {
        player.score += result.points;
        player.totalAnswers++;
        if (result.isCorrect) player.correctAnswers++;
      }

      game.answersReceived.add(info.playerId);
      game.questionResults.set(info.playerId, { isCorrect: result.isCorrect, points: result.points });

      callback?.({ received: true });

      const connectedPlayers = Array.from(game.players.values()).filter((p) => p.isConnected);
      io.to(`host:${game.sessionId}`).emit('game:answer-count', {
        count: game.answersReceived.size,
        total: connectedPlayers.length,
      });

      if (game.answersReceived.size >= connectedPlayers.length) {
        setTimeout(() => revealAnswer(io, game), 500);
      }
    });

    socket.on('host:reveal-answer', (_, callback) => {
      const info = socketToSession.get(socket.id);
      if (!info || !info.isHost) return callback?.({ error: 'Unauthorized' });

      const game = activeGames.get(info.sessionId);
      if (!game) return callback?.({ error: 'Game not found' });

      if (game.state !== 'QUESTION_ACTIVE') {
        return callback?.({ error: 'No active question to reveal' });
      }

      revealAnswer(io, game);
      callback?.({ success: true });
    });

    socket.on('host:show-leaderboard', (_, callback) => {
      const info = socketToSession.get(socket.id);
      if (!info || !info.isHost) return callback?.({ error: 'Unauthorized' });

      const game = activeGames.get(info.sessionId);
      if (!game) return callback?.({ error: 'Game not found' });

      if (game.state !== 'ANSWER_REVEAL') {
        return callback?.({ error: 'Leaderboard is available after the answer is revealed' });
      }

      showLeaderboard(io, game);
      callback?.({ success: true });
    });

    socket.on('host:end-game', (_, callback) => {
      const info = socketToSession.get(socket.id);
      if (!info || !info.isHost) return callback?.({ error: 'Unauthorized' });

      const game = activeGames.get(info.sessionId);
      if (!game) return callback?.({ error: 'Game not found' });

      finishGame(io, game);
      callback?.({ success: true });
    });

    socket.on('player:reconnect', (data, callback) => {
      const { sessionId, playerId } = data ?? {};
      if (!sessionId || !playerId) return callback?.({ error: 'Missing session or player ID' });

      const game = activeGames.get(sessionId);
      if (!game) return callback?.({ error: 'Game not found' });

      const player = game.players.get(playerId);
      if (!player) return callback?.({ error: 'Player not found' });

      if (player.socketId) {
        socketToSession.delete(player.socketId);
      }

      player.socketId = socket.id;
      player.isConnected = true;
      sessionService.updatePlayerConnection(playerId, socket.id, true);
      socketToSession.set(socket.id, { sessionId, playerId, isHost: false });
      socket.join(sessionId);

      emitPlayersUpdate(io, game);

      callback?.({
        success: true,
        displayName: player.displayName,
        avatar: player.avatar,
        score: player.score,
        gameState: game.state,
        currentQuestionIndex: game.currentQuestionIndex,
        totalQuestions: game.questions.length,
      });

      // Bring a refreshed or late-joining player into the question in progress.
      if (game.state === 'QUESTION_ACTIVE') {
        socket.emit('game:question-started', {
          ...buildQuestionPayload(game),
          alreadyAnswered: game.answersReceived.has(playerId),
        });
      }
    });

    socket.on('disconnect', () => {
      const info = socketToSession.get(socket.id);
      if (!info) return;

      const game = activeGames.get(info.sessionId);
      if (!game) {
        socketToSession.delete(socket.id);
        return;
      }

      if (info.isHost) {
        if (game.state === 'WAITING' || game.state === 'FINISHED') {
          socketToSession.delete(socket.id);
          return;
        }

        io.to(game.sessionId).emit('game:host-disconnected');

        game.hostDisconnectTimer = setTimeout(() => {
          finishGame(io, game);
        }, 30_000);
      } else if (info.playerId) {
        const player = game.players.get(info.playerId);
        if (player) {
          player.isConnected = false;
          player.socketId = null;
          sessionService.updatePlayerConnection(info.playerId, null, false);
          emitPlayersUpdate(io, game);
        }
      }

      socketToSession.delete(socket.id);
    });

    socket.on('host:reconnect', (data, callback) => {
      const { sessionId } = data ?? {};
      if (!sessionId) return callback?.({ error: 'Missing session ID' });

      const game = activeGames.get(sessionId);
      if (!game) return callback?.({ error: 'Game not found' });

      if (game.hostDisconnectTimer) {
        clearTimeout(game.hostDisconnectTimer);
        game.hostDisconnectTimer = null;
      }

      const oldSocketId = game.hostSocketId;
      if (oldSocketId) socketToSession.delete(oldSocketId);

      game.hostSocketId = socket.id;
      socketToSession.set(socket.id, { sessionId, isHost: true });
      socket.join(sessionId);
      socket.join(`host:${sessionId}`);

      io.to(sessionId).emit('game:host-reconnected');

      const quiz = quizService.getQuizById(game.quizId);

      callback?.({
        success: true,
        state: game.state,
        currentQuestionIndex: game.currentQuestionIndex,
        totalQuestions: game.questions.length,
        players: getPlayerList(game),
        pin: game.pin,
        quizTitle: quiz?.title ?? '',
        settings: game.settings,
        answerCount: game.answersReceived.size,
      });

      if (game.state === 'QUESTION_ACTIVE') {
        socket.emit('game:question-started', buildQuestionPayload(game));
      }
    });

    socket.on('host:get-session-info', (data, callback) => {
      const { sessionId } = data ?? {};
      const game = activeGames.get(sessionId);
      if (!game) return callback?.({ error: 'Game not found' });

      const info = socketToSession.get(socket.id);
      if (!info || !info.isHost || info.sessionId !== sessionId) {
        return callback?.({ error: 'Unauthorized' });
      }

      callback?.({
        state: game.state,
        pin: game.pin,
        players: getPlayerList(game),
        currentQuestionIndex: game.currentQuestionIndex,
        totalQuestions: game.questions.length,
        settings: game.settings,
      });
    });
  });
}
