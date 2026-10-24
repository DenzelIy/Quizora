import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { SkipForward, Trophy, StopCircle, Users, BarChart3, Check, X } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Timer } from '../components/Timer';
import { Leaderboard } from '../components/Leaderboard';
import { Scoreboard } from '../components/Scoreboard';
import { shapeIcons, answerSolidColors } from '../components/AnswerCard';
import { MuteButton } from '../components/MuteButton';
import {
  playAnswerIn,
  playPodium,
  playQuestionIntro,
  playQuestionMusic,
  playReveal,
  playScoreboard,
  playTick,
  stopMusic,
} from '../services/sound';
import { StartCountdown } from '../components/StartCountdown';
import { QuestionIntro } from '../components/QuestionIntro';
import { socket, connectSocket } from '../services/socket';
import { useCountdown } from '../hooks/useCountdown';

type SessionState = 'WAITING' | 'STARTING' | 'QUESTION_ACTIVE' | 'ANSWER_REVEAL' | 'LEADERBOARD' | 'FINISHED';

interface QuestionData {
  id: string;
  text: string;
  type: string;
  timeLimit: number;
  points: number;
  answers: { id: string; text: string }[];
}

interface QuestionStartedPayload {
  questionIndex: number;
  totalQuestions: number;
  introMs: number;
  introRemainingMs: number;
  remainingMs: number;
  question: QuestionData;
}

interface IntroTiming {
  until: number;
  introMs: number;
  remainingMs: number;
}

interface AnswerRevealPayload {
  autoAdvanceMs: number | null;
  correctAnswerId: string | null;
  explanation: string | null;
  stats: { answers: { id: string; text: string; is_correct: number; count: number }[] };
}

interface AnswerDistribution {
  answerId: string;
  text: string;
  count: number;
  isCorrect: boolean;
}

interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  score: number;
  correctAnswers: number;
  rank: number;
  previousRank?: number;
  previousScore?: number;
  avatar?: string;
}

/** Coloured answer tiles with the same shapes players see. Once the answer is known, wrong ones fade out. */
function AnswerTiles({ answers, correctAnswerId }: { answers: { id: string; text: string }[]; correctAnswerId: string | null }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {answers.map((ans, i) => {
        const Shape = shapeIcons[i % shapeIcons.length];
        const revealed = correctAnswerId !== null;
        const isCorrect = ans.id === correctAnswerId;
        return (
          <div
            key={ans.id}
            className={`p-4 sm:p-5 rounded-xl flex items-center gap-3 text-white transition-opacity ${
              answerSolidColors[i % answerSolidColors.length]
            } ${revealed && !isCorrect ? 'opacity-30' : ''}`}
          >
            <Shape className="w-6 h-6 shrink-0" fill="currentColor" />
            <span className="text-lg font-semibold flex-1">{ans.text}</span>
            {revealed && (isCorrect ? <Check className="w-7 h-7 shrink-0" strokeWidth={3} /> : <X className="w-6 h-6 shrink-0" />)}
          </div>
        );
      })}
    </div>
  );
}

/** Top-right countdown until the game moves on by itself. */
function AutoAdvanceBadge({ seconds }: { seconds: number }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-400" title="Moving on automatically">
      <span>Next in</span>
      <span className="w-11 h-11 rounded-full border-4 border-violet-500 flex items-center justify-center text-lg font-bold text-white tabular-nums">
        {seconds}
      </span>
    </div>
  );
}

export function HostGame() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const countdownUntil = (useLocation().state as { countdownUntil?: number } | null)?.countdownUntil;
  const [state, setState] = useState<SessionState>('STARTING');
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [answerCount, setAnswerCount] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [correctAnswerId, setCorrectAnswerId] = useState<string | null>(null);
  const [distribution, setDistribution] = useState<AnswerDistribution[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isFinalLeaderboard, setIsFinalLeaderboard] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [intro, setIntro] = useState<IntroTiming | null>(null);
  const timeRemaining = useCountdown(deadline);
  const introRemaining = useCountdown(intro?.until ?? null);
  const [autoAdvanceUntil, setAutoAdvanceUntil] = useState<number | null>(null);
  const autoAdvanceIn = useCountdown(autoAdvanceUntil);
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Sound ──
  const answersOpen = state === 'QUESTION_ACTIVE' && !!question && !(intro && introRemaining > 0);

  useEffect(() => {
    if (answersOpen) playQuestionMusic();
  }, [answersOpen, questionIndex]);

  useEffect(() => {
    if (answersOpen && question && question.timeLimit > 0 && timeRemaining > 0 && timeRemaining <= 5) {
      playTick(timeRemaining <= 3);
    }
  }, [timeRemaining, answersOpen, question]);

  useEffect(() => {
    if (answerCount > 0) playAnswerIn();
  }, [answerCount]);

  useEffect(() => {
    if (state === 'ANSWER_REVEAL') playReveal();
    else if (state === 'LEADERBOARD') playScoreboard();
    else if (state === 'FINISHED') playPodium();
  }, [state]);

  useEffect(() => () => stopMusic(), []);

  useEffect(() => {
    if (!sessionId) return;

    // Re-register as host on every (re)connect; the server re-sends the active question.
    const rejoin = () => {
      socket.emit('host:reconnect', { sessionId }, (response: { success?: boolean; state?: SessionState; players?: { isConnected: boolean }[]; answerCount?: number; totalQuestions?: number }) => {
        if (!response.success) {
          // The server forgets finished games, so stay on the final screen in that case.
          if (stateRef.current !== 'FINISHED') navigate('/host');
          return;
        }
        if (response.state === 'WAITING') {
          navigate(`/host/lobby/${sessionId}`);
          return;
        }
        setPlayerCount((response.players ?? []).filter((p) => p.isConnected).length);
        setAnswerCount(response.answerCount ?? 0);
        if (response.totalQuestions) setTotalQuestions(response.totalQuestions);
      });
    };

    const onQuestionStarted = (data: QuestionStartedPayload) => {
      const answersOpenAt = Date.now() + data.introRemainingMs;
      if (data.introRemainingMs > 0) playQuestionIntro();
      setQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setIntro({ until: answersOpenAt, introMs: data.introMs, remainingMs: data.introRemainingMs });
      setDeadline(data.question.timeLimit > 0 ? answersOpenAt + data.remainingMs : null);
      setAutoAdvanceUntil(null);
      setState('QUESTION_ACTIVE');
      setAnswerCount(0);
      setCorrectAnswerId(null);
      setDistribution([]);
      setExplanation(null);
    };

    const onAnswerCount = (data: { count: number; total: number }) => {
      setAnswerCount(data.count);
      setPlayerCount(data.total);
    };

    const onAnswerReveal = (data: AnswerRevealPayload) => {
      setState('ANSWER_REVEAL');
      setDeadline(null);
      setAutoAdvanceUntil(data.autoAdvanceMs != null ? Date.now() + data.autoAdvanceMs : null);
      setCorrectAnswerId(data.correctAnswerId);
      setExplanation(data.explanation || null);
      setDistribution(
        (data.stats?.answers ?? []).map((a) => ({
          answerId: a.id,
          text: a.text,
          count: a.count,
          isCorrect: a.id === data.correctAnswerId,
        })),
      );
    };

    const onLeaderboard = (data: { leaderboard: LeaderboardEntry[]; isFinal?: boolean; autoAdvanceMs: number | null }) => {
      setLeaderboard(data.leaderboard);
      setAutoAdvanceUntil(data.autoAdvanceMs != null ? Date.now() + data.autoAdvanceMs : null);
      setIsFinalLeaderboard(!!data.isFinal);
      setState('LEADERBOARD');
    };

    const onGameFinished = (data: { leaderboard: LeaderboardEntry[] }) => {
      setLeaderboard(data.leaderboard);
      setState('FINISHED');
    };

    const onPlayersUpdated = (data: { players: { id: string; isConnected: boolean }[] }) => {
      setPlayerCount(data.players.filter((p) => p.isConnected).length);
    };

    socket.on('connect', rejoin);
    socket.on('game:question-started', onQuestionStarted);
    socket.on('game:answer-count', onAnswerCount);
    socket.on('game:answer-reveal', onAnswerReveal);
    socket.on('game:leaderboard-updated', onLeaderboard);
    socket.on('game:finished', onGameFinished);
    socket.on('session:players-updated', onPlayersUpdated);

    if (socket.connected) rejoin();
    else connectSocket().catch(() => {});

    return () => {
      socket.off('connect', rejoin);
      socket.off('game:question-started', onQuestionStarted);
      socket.off('game:answer-count', onAnswerCount);
      socket.off('game:answer-reveal', onAnswerReveal);
      socket.off('game:leaderboard-updated', onLeaderboard);
      socket.off('game:finished', onGameFinished);
      socket.off('session:players-updated', onPlayersUpdated);
    };
  }, [sessionId, navigate]);

  const handleNext = useCallback(() => {
    socket.emit('host:next-question', { sessionId });
  }, [sessionId]);

  const handleShowLeaderboard = useCallback(() => {
    socket.emit('host:show-leaderboard', { sessionId });
  }, [sessionId]);

  const handleEndGame = useCallback(() => {
    if (confirm('End the game now?')) {
      socket.emit('host:end-game', { sessionId });
    }
  }, [sessionId]);

  // Votes per answer, keyed by id so bars follow the on-screen answer order even when answers are shuffled.
  const votesById = new Map(distribution.map((d) => [d.answerId, d.count]));
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  if (state === 'FINISHED') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 fade-in">
        <div className="text-center space-y-2">
          <Trophy className="w-12 h-12 text-yellow-400 mx-auto" />
          <h1 className="text-3xl font-bold text-white">Game Over!</h1>
        </div>
        <Leaderboard entries={leaderboard} showPodium />
        <div className="flex justify-center gap-3">
          <Button onClick={() => navigate(`/host/results/${sessionId}`)} icon={<BarChart3 className="w-4 h-4" />}>
            View Results
          </Button>
          <Button variant="secondary" onClick={() => navigate('/host')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (state === 'LEADERBOARD') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8 fade-in">
        <div className="flex items-center justify-end gap-3 min-h-11">
          {autoAdvanceUntil && <AutoAdvanceBadge seconds={autoAdvanceIn} />}
          <MuteButton />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Scoreboard</h2>
          <p className="text-sm text-slate-400">
            Top players after question {questionIndex + 1} of {totalQuestions}
          </p>
        </div>
        <Scoreboard entries={leaderboard} limit={5} />
        <div className="flex justify-center">
          <Button size="lg" icon={<SkipForward className="w-5 h-5" />} onClick={handleNext}>
            {isFinalLeaderboard ? 'Finish Game' : 'Next Question'}
          </Button>
        </div>
      </div>
    );
  }

  if (!question) {
    if (countdownUntil) return <StartCountdown until={countdownUntil} withSound />;
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-lg text-slate-400">Starting game...</p>
      </div>
    );
  }

  if (state === 'QUESTION_ACTIVE' && intro && introRemaining > 0) {
    return (
      <QuestionIntro
        questionIndex={questionIndex}
        totalQuestions={totalQuestions}
        text={question.text}
        introMs={intro.introMs}
        remainingMs={intro.remainingMs}
      />
    );
  }

  const isLastQuestion = questionIndex >= totalQuestions - 1;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 min-h-22.5">
        <div className="space-y-1">
          <span className="block text-sm font-medium text-slate-400">
            Question {questionIndex + 1} / {totalQuestions}
          </span>
          <span className="text-sm text-slate-400 flex items-center gap-1">
            <Users className="w-4 h-4" />
            {answerCount}/{playerCount} answered
          </span>
        </div>
        <div className="flex items-center gap-3">
          {question.timeLimit > 0 && state === 'QUESTION_ACTIVE' && (
            <Timer timeRemaining={timeRemaining} totalTime={question.timeLimit} size="md" />
          )}
          {state === 'ANSWER_REVEAL' && autoAdvanceUntil && <AutoAdvanceBadge seconds={autoAdvanceIn} />}
          <MuteButton />
          <Button size="sm" variant="danger" icon={<StopCircle className="w-3.5 h-3.5" />} onClick={handleEndGame}>
            End
          </Button>
        </div>
      </div>

      <Card padding="lg">
        <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
          {question.text}
        </h2>
        <p className="text-sm text-slate-400 mt-2">{question.points} points</p>
      </Card>

      {state === 'ANSWER_REVEAL' && (
        <div className="space-y-6 fade-in">
          {/* Votes per answer, Kahoot-style: one column per answer in its colour, the correct one ticked. */}
          <div className="flex items-end justify-center gap-4 sm:gap-8 h-48">
            {question.answers.map((ans, i) => {
              const isCorrect = ans.id === correctAnswerId;
              const votes = votesById.get(ans.id) ?? 0;
              const Shape = shapeIcons[i % shapeIcons.length];
              return (
                <div key={ans.id} className={`flex flex-col items-center justify-end h-full w-16 sm:w-24 ${isCorrect ? '' : 'opacity-40'}`}>
                  <span className="text-2xl font-bold text-white mb-1">{votes}</span>
                  <div
                    className={`w-full rounded-t-lg ${answerSolidColors[i % answerSolidColors.length]} transition-all duration-700`}
                    style={{ height: `${Math.max((votes / maxCount) * 100, 4)}%` }}
                  />
                  <div className={`w-full flex items-center justify-center gap-1 py-1.5 rounded-b-lg ${answerSolidColors[i % answerSolidColors.length]}`}>
                    <Shape className="w-4 h-4 text-white" fill="currentColor" />
                    {isCorrect && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>

          <AnswerTiles answers={question.answers} correctAnswerId={correctAnswerId} />

          {explanation && (
            <Card className="bg-violet-500/5 border-violet-500/20">
              <p className="text-sm text-violet-200">{explanation}</p>
            </Card>
          )}

          <div className="flex justify-center gap-3">
            <Button icon={<Trophy className="w-4 h-4" />} variant="secondary" onClick={handleShowLeaderboard}>
              Leaderboard
            </Button>
            <Button size="lg" icon={<SkipForward className="w-5 h-5" />} onClick={handleNext}>
              {isLastQuestion ? 'Finish' : 'Next Question'}
            </Button>
          </div>
        </div>
      )}

      {state === 'QUESTION_ACTIVE' && <AnswerTiles answers={question.answers} correctAnswerId={null} />}
    </div>
  );
}
