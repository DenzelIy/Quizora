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
  answersReceived: Set<string>;
  hostDisconnectTimer: ReturnType<typeof setTimeout> | null;
}

const activeGames = new Map<string, ActiveGame>();
const pinToSession = new Map<string, string>();
const socketToSession = new Map<string, { sessionId: string; playerId?: string; isHost: boolean }>();

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
};

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

function sendQuestionToClients(io: Server, game: ActiveGame) {
  const question = game.questions[game.currentQuestionIndex];
  if (!question) return;

  game.state = 'QUESTION_ACTIVE';
  game.questionStartTime = Date.now();
  game.answersReceived = new Set();

  const timeLimit = game.settings.questionTimer ? question.timeLimit : 0;

  const hostQuestion = {
    questionIndex: game.currentQuestionIndex,
    totalQuestions: game.questions.length,
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

  const playerQuestion = {
    questionIndex: game.currentQuestionIndex,
    totalQuestions: game.questions.length,
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

  io.to(`host:${game.sessionId}`).emit('game:question-started', hostQuestion);

  for (const player of game.players.values()) {
    if (player.socketId && player.isConnected) {
      io.to(player.socketId).emit('game:question-started', playerQuestion);
    }
  }

  if (timeLimit > 0) {
    if (game.questionTimer) clearTimeout(game.questionTimer);
    game.questionTimer = setTimeout(() => {
      handleTimeUp(io, game);
    }, timeLimit * 1000 + 500);
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

  const revealData = {
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

  for (const player of game.players.values()) {
    if (!player.socketId || !player.isConnected) continue;
    const answered = game.answersReceived.has(player.id);
    io.to(player.socketId).emit('game:your-result', {
      playerId: player.id,
      answered,
      score: player.score,
    });
  }
}

function showLeaderboard(io: Server, game: ActiveGame) {
  game.state = 'LEADERBOARD';
  const leaderboard = scoringService.getLeaderboard(game.sessionId);

  for (const entry of leaderboard) {
    const player = game.players.get(entry.id);
    if (player) {
      player.score = entry.score;
      player.correctAnswers = entry.correct_answers;
      player.totalAnswers = entry.total_answers;
    }
  }

  io.to(game.sessionId).emit('game:leaderboard-updated', {
    leaderboard,
    questionIndex: game.currentQuestionIndex,
    totalQuestions: game.questions.length,
    isFinal: game.currentQuestionIndex >= game.questions.length - 1,
  });
}

function finishGame(io: Server, game: ActiveGame) {
  game.state = 'FINISHED';
  if (game.questionTimer) {
    clearTimeout(game.questionTimer);
    game.questionTimer = null;
  }

  const leaderboard = scoringService.getLeaderboard(game.sessionId);

  for (const entry of leaderboard) {
    const player = game.players.get(entry.id);
    if (player) {
      player.score = entry.score;
      player.correctAnswers = entry.correct_answers;
      player.totalAnswers = entry.total_answers;
    }
  }

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

        const mergedSettings: GameSettings = { ...DEFAULT_SETTINGS, ...settings };
        const session = sessionService.createSession(quizId, socket.id, mergedSettings as unknown as Record<string, unknown>);

        let questions: Question[] = quiz.questions.map((q: any) => ({
          ...q,
          answers: q.answers ?? [],
        }));

        if (mergedSettings.randomizeQuestions) {
          questions = shuffleArray(questions);
        }
        if (mergedSettings.randomizeAnswers) {
          questions = questions.map((q) => ({ ...q, answers: shuffleArray(q.answers) }));
        }

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
          answersReceived: new Set(),
          hostDisconnectTimer: null,
        };

        activeGames.set(session.id, game);
        pinToSession.set(session.pin, session.id);
        socketToSession.set(socket.id, { sessionId: session.id, isHost: true });

        socket.join(session.id);
        socket.join(`host:${session.id}`);

        callback?.({
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
        const { pin, displayName: rawName } = data ?? {};
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

        const player = sessionService.addPlayer(sessionId, displayName, socket.id);

        game.players.set(player.id, {
          id: player.id,
          displayName: player.displayName,
          socketId: socket.id,
          score: 0,
          correctAnswers: 0,
          totalAnswers: 0,
          isConnected: true,
        });

        socketToSession.set(socket.id, { sessionId, playerId: player.id, isHost: false });
        socket.join(sessionId);

        emitPlayersUpdate(io, game);

        callback?.({
          playerId: player.id,
          sessionId,
          displayName: player.displayName,
          quizTitle: game.questions.length > 0 ? undefined : undefined,
          gameState: game.state,
        });
      } catch (err) {
        console.error('Error joining session:', err);
        callback?.({ error: 'Failed to join game' });
      }
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

    socket.on('host:start-game', (_, callback) => {
      const info = socketToSession.get(socket.id);
      if (!info || !info.isHost) return callback?.({ error: 'Unauthorized' });

      const game = activeGames.get(info.sessionId);
      if (!game) return callback?.({ error: 'Game not found' });
      if (game.state !== 'WAITING') return callback?.({ error: 'Game already started' });

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

      if (game.state === 'ANSWER_REVEAL' && game.settings.showLeaderboard === 'after-each') {
        showLeaderboard(io, game);
        return callback?.({ success: true });
      }

      game.currentQuestionIndex++;

      if (game.currentQuestionIndex >= game.questions.length) {
        if (game.settings.showLeaderboard !== 'never') {
          showLeaderboard(io, game);
          setTimeout(() => finishGame(io, game), 100);
        } else {
          finishGame(io, game);
        }
        return callback?.({ success: true });
      }

      sendQuestionToClients(io, game);
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
      const timeLimitMs = question.timeLimit * 1000;

      if (game.settings.questionTimer && responseTimeMs > timeLimitMs + 1000) {
        return callback?.({ error: 'Time is up' });
      }

      const isCorrect = validAnswer.isCorrect;

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
        score: player.score,
        gameState: game.state,
        currentQuestionIndex: game.currentQuestionIndex,
        totalQuestions: game.questions.length,
      });
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

      callback?.({
        success: true,
        state: game.state,
        currentQuestionIndex: game.currentQuestionIndex,
        totalQuestions: game.questions.length,
        players: getPlayerList(game),
        pin: game.pin,
      });
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
