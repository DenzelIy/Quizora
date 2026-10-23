import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Zap, CheckCircle, XCircle, Trophy, Clock } from 'lucide-react';
import { AnswerCard } from '../components/AnswerCard';
import { Timer } from '../components/Timer';
import { Leaderboard } from '../components/Leaderboard';
import { socket, connectSocket } from '../services/socket';

type SessionState = 'WAITING' | 'STARTING' | 'QUESTION_ACTIVE' | 'ANSWER_REVEAL' | 'LEADERBOARD' | 'FINISHED';

interface QuestionData {
  id: string;
  text: string;
  type: string;
  timeLimit: number;
  answers: { id: string; text: string; isCorrect?: boolean }[];
  questionIndex: number;
  totalQuestions: number;
  explanation?: string | null;
}

interface AnswerResult {
  isCorrect: boolean;
  pointsEarned: number;
  totalScore: number;
  rank: number;
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
  const { playerId, playerName } = (location.state as { playerId?: string; playerName?: string }) || {};

  const [state, setState] = useState<SessionState>('WAITING');
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!sessionId || !playerId) {
      navigate('/join');
      return;
    }

    const connect = async () => {
      if (!socket.connected) await connectSocket();
    };
    connect();

    const onQuestionStarted = (data: { question: QuestionData; timeLimit: number }) => {
      setQuestion(data.question);
      setTimeRemaining(data.timeLimit);
      setState('QUESTION_ACTIVE');
      setSelectedAnswer(null);
      setSubmitted(false);
      setResult(null);
    };

    const onTimerTick = (data: { timeRemaining: number }) => setTimeRemaining(data.timeRemaining);

    const onAnswerAccepted = (data: AnswerResult) => {
      setResult(data);
    };

    const onAnswerReveal = (data: { correctAnswers: { id: string; text: string; isCorrect: boolean }[]; explanation?: string | null }) => {
      setState('ANSWER_REVEAL');
      if (question) {
        setQuestion({ ...question, answers: data.correctAnswers, explanation: data.explanation });
      }
      if (result?.isCorrect) {
        setStreak((s) => s + 1);
      } else {
        setStreak(0);
      }
    };

    const onLeaderboard = (data: { leaderboard: LeaderboardEntry[] }) => {
      setLeaderboard(data.leaderboard);
      setState('LEADERBOARD');
    };

    const onGameFinished = (data: { leaderboard: LeaderboardEntry[] }) => {
      setLeaderboard(data.leaderboard);
      setState('FINISHED');
    };

    const onSessionInfo = (data: { quizTitle: string }) => {
      setQuizTitle(data.quizTitle);
    };

    const onKicked = () => {
      navigate('/join');
    };

    socket.on('game:question-started', onQuestionStarted);
    socket.on('game:timer-tick', onTimerTick);
    socket.on('game:answer-accepted', onAnswerAccepted);
    socket.on('game:answer-reveal', onAnswerReveal);
    socket.on('game:leaderboard', onLeaderboard);
    socket.on('game:finished', onGameFinished);
    socket.on('session:info', onSessionInfo);
    socket.on('session:kicked', onKicked);

    return () => {
      socket.off('game:question-started', onQuestionStarted);
      socket.off('game:timer-tick', onTimerTick);
      socket.off('game:answer-accepted', onAnswerAccepted);
      socket.off('game:answer-reveal', onAnswerReveal);
      socket.off('game:leaderboard', onLeaderboard);
      socket.off('game:finished', onGameFinished);
      socket.off('session:info', onSessionInfo);
      socket.off('session:kicked', onKicked);
    };
  }, [sessionId, playerId, navigate, question, result]);

  const handleSubmitAnswer = (answerId: string) => {
    if (submitted || state !== 'QUESTION_ACTIVE') return;
    setSelectedAnswer(answerId);
    setSubmitted(true);
    socket.emit('player:submit-answer', {
      sessionId,
      playerId,
      questionId: question?.id,
      answerId,
    });
  };

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
          <Leaderboard entries={leaderboard.slice(0, 10)} highlightPlayerId={playerId} showPodium={false} />
          <p className="text-sm text-slate-400 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" /> Waiting for next question...
          </p>
        </div>
      </div>
    );
  }

  if (state === 'ANSWER_REVEAL') {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full text-center space-y-6 fade-in">
          {result ? (
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
                  Correct answer: {question?.answers.find((a) => a.isCorrect)?.text}
                </p>
              </>
            )
          ) : (
            <>
              <XCircle className="w-20 h-20 text-slate-500 mx-auto" />
              <h2 className="text-2xl font-bold text-slate-400">Time's up!</h2>
              <p className="text-sm text-slate-400">
                Correct answer: {question?.answers.find((a) => a.isCorrect)?.text}
              </p>
            </>
          )}
          {question?.explanation && (
            <p className="text-sm text-violet-200 bg-violet-500/10 rounded-lg p-3">{question.explanation}</p>
          )}
          <p className="text-sm text-slate-400">
            Total: {(result?.totalScore ?? 0).toLocaleString()} pts - Rank #{result?.rank ?? '-'}
          </p>
        </div>
      </div>
    );
  }

  if (state === 'QUESTION_ACTIVE' && question) {
    if (submitted) {
      return (
        <div className="gradient-bg min-h-screen flex items-center justify-center px-4">
          <div className="text-center space-y-4 fade-in">
            <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-violet-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Answer Submitted!</h2>
            <p className="text-sm text-slate-400">Waiting for everyone to answer...</p>
            <Timer timeRemaining={timeRemaining} totalTime={question.timeLimit} size="sm" />
          </div>
        </div>
      );
    }

    return (
      <div className="gradient-bg min-h-screen flex flex-col px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-slate-400 font-medium">
            Q{question.questionIndex + 1}/{question.totalQuestions}
          </span>
          <Timer timeRemaining={timeRemaining} totalTime={question.timeLimit} size="sm" />
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

  return (
    <div className="gradient-bg min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4 fade-in">
        <div className="w-16 h-16 rounded-2xl bg-violet-500 flex items-center justify-center mx-auto">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Get Ready!</h2>
        {quizTitle && <p className="text-slate-400">{quizTitle}</p>}
        <p className="text-sm text-slate-500">
          Hi {playerName || 'Player'}! Waiting for the host to start...
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
