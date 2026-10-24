import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Zap, CheckCircle, XCircle, Trophy, Clock, Pencil } from 'lucide-react';
import { AnswerCard } from '../components/AnswerCard';
import { Timer } from '../components/Timer';
import { Leaderboard } from '../components/Leaderboard';
import { StartCountdown } from '../components/StartCountdown';
import { QuestionIntro } from '../components/QuestionIntro';
import { socket, connectSocket } from '../services/socket';
import { useCountdown } from '../hooks/useCountdown';
import { playCorrect, playWrong } from '../services/sound';
import { AVATARS } from '../components/avatars';

type SessionState = 'WAITING' | 'STARTING' | 'QUESTION_ACTIVE' | 'ANSWER_REVEAL' | 'LEADERBOARD' | 'FINISHED';

interface QuestionData {
  id: string;
  text: string;
  type: string;
  timeLimit: number;
  answers: { id: string; text: string }[];
}

interface QuestionStartedPayload {
  questionIndex: number;
  totalQuestions: number;
  introMs: number;
  introRemainingMs: number;
  remainingMs: number;
  alreadyAnswered?: boolean;
  question: QuestionData;
}

interface AnswerResult {
  answered: boolean;
  isCorrect: boolean;
  pointsEarned: number;
  score: number;
  rank: number | null;
}

interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  score: number;
  correctAnswers: number;
  rank: number;
  previousRank?: number;
}

export function PlayerGame() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { playerId, playerName, avatar: joinedAvatar } = (location.state as { playerId?: string; playerName?: string; avatar?: string }) || {};
  const [avatar, setAvatar] = useState(joinedAvatar);
  const [pickingAvatar, setPickingAvatar] = useState(false);

  const changeAvatar = (next: string) => {
    setAvatar(next);
    setPickingAvatar(false);
    socket.emit('player:update-avatar', { avatar: next }, (response: { success?: boolean; avatar?: string }) => {
      if (response.success && response.avatar) setAvatar(response.avatar);
    });
  };

  const [state, setState] = useState<SessionState>('WAITING');
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [correctAnswerId, setCorrectAnswerId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [countdownUntil, setCountdownUntil] = useState<number | null>(null);
  const [intro, setIntro] = useState<{ until: number; introMs: number; remainingMs: number } | null>(null);
  const timeRemaining = useCountdown(deadline);
  const introRemaining = useCountdown(intro?.until ?? null);
  const [autoAdvanceUntil, setAutoAdvanceUntil] = useState<number | null>(null);
  const autoAdvanceIn = useCountdown(autoAdvanceUntil);
  const nextNote = autoAdvanceUntil && autoAdvanceIn > 0 ? `Moving on in ${autoAdvanceIn}s` : 'Waiting for next question...';
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!sessionId || !playerId) {
      navigate('/join');
      return;
    }

    // Re-attach this socket to the player on every (re)connect: page refreshes and
    // network blips give the browser a new socket the server doesn't know yet.
    const rejoin = () => {
      socket.emit('player:reconnect', { sessionId, playerId }, (response: { success?: boolean; gameState?: SessionState; avatar?: string }) => {
        if (response.avatar) setAvatar(response.avatar);
        if (!response.success) {
          // The server forgets finished games, so stay on the final screen in that case.
          if (stateRef.current !== 'FINISHED') navigate('/join');
          return;
        }
        if (response.gameState === 'STARTING') setState('STARTING');
      });
    };

    const onQuestionStarted = (data: QuestionStartedPayload) => {
      const answersOpenAt = Date.now() + data.introRemainingMs;
      setQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setIntro({ until: answersOpenAt, introMs: data.introMs, remainingMs: data.introRemainingMs });
      setDeadline(data.question.timeLimit > 0 ? answersOpenAt + data.remainingMs : null);
      setAutoAdvanceUntil(null);
      setState('QUESTION_ACTIVE');
      setSelectedAnswer(null);
      setSubmitted(!!data.alreadyAnswered);
      setResult(null);
      setCorrectAnswerId(null);
      setExplanation(null);
    };

    // The server sends this just before the reveal.
    const onYourResult = (data: AnswerResult) => {
      setResult(data);
      setStreak((s) => (data.isCorrect ? s + 1 : 0));
      if (data.isCorrect) playCorrect();
      else playWrong();
    };

    const onAnswerReveal = (data: { correctAnswerId: string | null; explanation: string | null; autoAdvanceMs: number | null }) => {
      setState('ANSWER_REVEAL');
      setDeadline(null);
      setAutoAdvanceUntil(data.autoAdvanceMs != null ? Date.now() + data.autoAdvanceMs : null);
      setCorrectAnswerId(data.correctAnswerId);
      setExplanation(data.explanation);
    };

    const onGameStarting = (data: { countdown: number }) => {
      setCountdownUntil(Date.now() + data.countdown * 1000);
      setState('STARTING');
    };

    const onLeaderboard = (data: { leaderboard: LeaderboardEntry[]; autoAdvanceMs: number | null }) => {
      setLeaderboard(data.leaderboard);
      setAutoAdvanceUntil(data.autoAdvanceMs != null ? Date.now() + data.autoAdvanceMs : null);
      setState('LEADERBOARD');
    };

    const onGameFinished = (data: { leaderboard: LeaderboardEntry[] }) => {
      setLeaderboard(data.leaderboard);
      setState('FINISHED');
    };

    const onKicked = () => {
      navigate('/join');
    };

    socket.on('connect', rejoin);
    socket.on('game:starting', onGameStarting);
    socket.on('game:question-started', onQuestionStarted);
    socket.on('game:your-result', onYourResult);
    socket.on('game:answer-reveal', onAnswerReveal);
    socket.on('game:leaderboard-updated', onLeaderboard);
    socket.on('game:finished', onGameFinished);
    socket.on('player:kicked', onKicked);

    if (socket.connected) rejoin();
    else connectSocket().catch(() => {});

    return () => {
      socket.off('connect', rejoin);
      socket.off('game:starting', onGameStarting);
      socket.off('game:question-started', onQuestionStarted);
      socket.off('game:your-result', onYourResult);
      socket.off('game:answer-reveal', onAnswerReveal);
      socket.off('game:leaderboard-updated', onLeaderboard);
      socket.off('game:finished', onGameFinished);
      socket.off('player:kicked', onKicked);
    };
  }, [sessionId, playerId, navigate]);

  const handleSubmitAnswer = (answerId: string) => {
    if (submitted || state !== 'QUESTION_ACTIVE') return;
    setSelectedAnswer(answerId);
    setSubmitted(true);
    socket.emit('player:submit-answer', { answerId }, (response: { received?: boolean; error?: string }) => {
      // Let the player try again if the answer didn't reach the game (e.g. mid-reconnect).
      if (response.error && response.error !== 'Already answered' && response.error !== 'Time is up') {
        setSelectedAnswer(null);
        setSubmitted(false);
      }
    });
  };

  const correctAnswerText = question?.answers.find((a) => a.id === correctAnswerId)?.text;

  if (state === 'FINISHED') {
    const myRank = leaderboard.find((e) => e.playerId === playerId);
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full text-center space-y-6 fade-in">
          <Trophy className="w-16 h-16 text-yellow-400 mx-auto" />
          <h1 className="text-3xl font-bold text-white">Game Over!</h1>
          {myRank && (
            <div className="space-y-2">
              <p className="text-5xl font-bold text-violet-400">#{myRank.rank}</p>
              <p className="text-lg text-slate-300">{myRank.score.toLocaleString()} points</p>
              <p className="text-sm text-slate-400">{myRank.correctAnswers} correct answers</p>
            </div>
          )}
          <Leaderboard entries={leaderboard.slice(0, 5)} highlightPlayerId={playerId} showPodium={false} />
          <button onClick={() => navigate('/join')} className="text-sm text-slate-400 hover:text-white transition-colors">
            Play again
          </button>
        </div>
      </div>
    );
  }

  if (state === 'LEADERBOARD') {
    const myRank = leaderboard.find((e) => e.playerId === playerId);
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full text-center space-y-4 fade-in">
          <h2 className="text-xl font-bold text-white">Leaderboard</h2>
          {myRank && (
            <p className="text-lg text-violet-300">
              You're #{myRank.rank} with {myRank.score.toLocaleString()} pts
            </p>
          )}
          <Leaderboard entries={leaderboard.slice(0, 5)} highlightPlayerId={playerId} showPodium={false} />
          <p className="text-sm text-slate-400 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" /> {nextNote}
          </p>
        </div>
      </div>
    );
  }

  if (state === 'ANSWER_REVEAL') {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full text-center space-y-6 fade-in">
          {result?.answered ? (
            result.isCorrect ? (
              <>
                <CheckCircle className="w-20 h-20 text-emerald-400 mx-auto pulse-grow" />
                <h2 className="text-2xl font-bold text-emerald-300">Correct!</h2>
                <p className="text-3xl font-bold text-white">+{result.pointsEarned.toLocaleString()}</p>
                {streak > 1 && (
                  <p className="text-sm text-yellow-400">{streak} answer streak!</p>
                )}
              </>
            ) : (
              <>
                <XCircle className="w-20 h-20 text-red-400 mx-auto" />
                <h2 className="text-2xl font-bold text-red-300">Incorrect</h2>
                <p className="text-sm text-slate-400">
                  Correct answer: {correctAnswerText}
                </p>
              </>
            )
          ) : (
            <>
              <XCircle className="w-20 h-20 text-slate-500 mx-auto" />
              <h2 className="text-2xl font-bold text-slate-400">Time's up!</h2>
              <p className="text-sm text-slate-400">
                Correct answer: {correctAnswerText}
              </p>
            </>
          )}
          {explanation && (
            <p className="text-sm text-violet-200 bg-violet-500/10 rounded-lg p-3">{explanation}</p>
          )}
          <p className="text-sm text-slate-400">
            Total: {(result?.score ?? 0).toLocaleString()} pts - Rank #{result?.rank ?? '-'}
          </p>
          {autoAdvanceUntil && (
            <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" /> {nextNote}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (state === 'QUESTION_ACTIVE' && question) {
    if (intro && introRemaining > 0) {
      return (
        <div className="gradient-bg min-h-screen flex items-center justify-center">
          <QuestionIntro
            questionIndex={questionIndex}
            totalQuestions={totalQuestions}
            text={question.text}
            introMs={intro.introMs}
            remainingMs={intro.remainingMs}
            size="md"
          />
        </div>
      );
    }

    if (submitted) {
      return (
        <div className="gradient-bg min-h-screen flex items-center justify-center px-4">
          <div className="text-center space-y-4 fade-in">
            <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-violet-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Answer Submitted!</h2>
            <p className="text-sm text-slate-400">Waiting for everyone to answer...</p>
            {question.timeLimit > 0 && (
              <Timer timeRemaining={timeRemaining} totalTime={question.timeLimit} size="sm" />
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="gradient-bg min-h-screen flex flex-col px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-slate-400 font-medium">
            Q{questionIndex + 1}/{totalQuestions}
          </span>
          {question.timeLimit > 0 && (
            <Timer timeRemaining={timeRemaining} totalTime={question.timeLimit} size="sm" />
          )}
        </div>

        <div className="mb-4 px-2">
          <h2 className="text-lg sm:text-xl font-bold text-white leading-snug text-center">
            {question.text}
          </h2>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-3 max-w-lg mx-auto w-full">
          {question.answers.map((ans, i) => (
            <AnswerCard
              key={ans.id}
              text={ans.text}
              index={i}
              selected={selectedAnswer === ans.id}
              onClick={() => handleSubmitAnswer(ans.id)}
              disabled={submitted}
            />
          ))}
        </div>
      </div>
    );
  }

  if (state === 'STARTING' && countdownUntil) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center px-4">
        <StartCountdown until={countdownUntil} />
      </div>
    );
  }

  return (
    <div className="gradient-bg min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4 fade-in max-w-sm w-full">
        <button
          type="button"
          onClick={() => setPickingAvatar((p) => !p)}
          className="relative mx-auto block group"
          aria-label="Change character"
        >
          {avatar ? (
            <span key={avatar} className="block text-7xl leading-none pulse-grow">{avatar}</span>
          ) : (
            <span className="w-16 h-16 rounded-2xl bg-violet-500 flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </span>
          )}
          <span className="absolute -bottom-1 -right-3 w-7 h-7 rounded-full bg-violet-500 text-white flex items-center justify-center shadow group-hover:bg-violet-400">
            <Pencil className="w-3.5 h-3.5" />
          </span>
        </button>
        {pickingAvatar ? (
          <div className="grid grid-cols-6 gap-1.5 fade-in">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => changeAvatar(a)}
                className={`aspect-square rounded-lg text-2xl flex items-center justify-center transition-all ${
                  a === avatar ? 'bg-violet-500 ring-2 ring-violet-300' : 'bg-slate-800/70 hover:bg-slate-700'
                }`}
                aria-label={`Character ${a}`}
                aria-pressed={a === avatar}
              >
                {a}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Tap your character to change it</p>
        )}
        <h2 className="text-2xl font-bold text-white">Get Ready!</h2>
        <p className="text-sm text-slate-500">
          {state === 'STARTING'
            ? 'The game is starting...'
            : `Hi ${playerName || 'Player'}! Waiting for the host to start...`}
        </p>
        <div className="animate-pulse flex justify-center gap-1">
          <div className="w-2 h-2 bg-violet-500 rounded-full" />
          <div className="w-2 h-2 bg-violet-500 rounded-full animation-delay-200" />
          <div className="w-2 h-2 bg-violet-500 rounded-full animation-delay-400" />
        </div>
      </div>
    </div>
  );
}
