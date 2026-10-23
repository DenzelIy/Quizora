import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SkipForward, Trophy, StopCircle, Users, BarChart3 } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Timer } from '../components/Timer';
import { Leaderboard } from '../components/Leaderboard';
import { socket, connectSocket } from '../services/socket';

type SessionState = 'WAITING' | 'STARTING' | 'QUESTION_ACTIVE' | 'ANSWER_REVEAL' | 'LEADERBOARD' | 'FINISHED';

interface QuestionData {
  id: string;
  text: string;
  type: string;
  timeLimit: number;
  points: number;
  answers: { id: string; text: string; isCorrect?: boolean }[];
  questionIndex: number;
  totalQuestions: number;
  explanation?: string | null;
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
}

export function HostGame() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<SessionState>('STARTING');
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [answerCount, setAnswerCount] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [distribution, setDistribution] = useState<AnswerDistribution[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [explanation, setExplanation] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const connect = async () => {
      if (!socket.connected) await connectSocket();
    };
    connect();

    const onQuestionStarted = (data: { question: QuestionData; timeLimit: number }) => {
      setQuestion(data.question);
      setTimeRemaining(data.timeLimit);
      setState('QUESTION_ACTIVE');
      setAnswerCount(0);
      setDistribution([]);
      setExplanation(null);
    };

    const onTimerTick = (data: { timeRemaining: number }) => setTimeRemaining(data.timeRemaining);

    const onAnswerCount = (data: { count: number; total: number }) => {
      setAnswerCount(data.count);
      setPlayerCount(data.total);
    };

    const onAnswerReveal = (data: { correctAnswers: { id: string; text: string; isCorrect: boolean }[]; distribution: AnswerDistribution[]; explanation?: string | null }) => {
      setState('ANSWER_REVEAL');
      setDistribution(data.distribution);
      setExplanation(data.explanation || null);
      if (question) {
        setQuestion({ ...question, answers: data.correctAnswers });
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

    const onPlayersUpdated = (data: { players: { id: string; isConnected: boolean }[] }) => {
      setPlayerCount(data.players.filter((p) => p.isConnected).length);
    };

    socket.on('game:question-started', onQuestionStarted);
    socket.on('game:timer-tick', onTimerTick);
    socket.on('game:answer-count', onAnswerCount);
    socket.on('game:answer-reveal', onAnswerReveal);
    socket.on('game:leaderboard', onLeaderboard);
    socket.on('game:finished', onGameFinished);
    socket.on('session:players-updated', onPlayersUpdated);

    return () => {
      socket.off('game:question-started', onQuestionStarted);
      socket.off('game:timer-tick', onTimerTick);
      socket.off('game:answer-count', onAnswerCount);
      socket.off('game:answer-reveal', onAnswerReveal);
      socket.off('game:leaderboard', onLeaderboard);
      socket.off('game:finished', onGameFinished);
      socket.off('session:players-updated', onPlayersUpdated);
    };
  }, [sessionId, question]);

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

  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  const answerBarColors = ['bg-red-500', 'bg-blue-500', 'bg-emerald-500', 'bg-yellow-500', 'bg-purple-500', 'bg-cyan-500'];

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
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 fade-in">
        <h2 className="text-xl font-bold text-white text-center">Leaderboard</h2>
        <Leaderboard entries={leaderboard} showPodium />
        <div className="flex justify-center">
          <Button size="lg" icon={<SkipForward className="w-5 h-5" />} onClick={handleNext}>
            Next Question
          </Button>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-lg text-slate-400">Starting game...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">
          Question {question.questionIndex + 1} / {question.totalQuestions}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400 flex items-center gap-1">
            <Users className="w-4 h-4" />
            {answerCount}/{playerCount} answered
          </span>
          <Button size="sm" variant="danger" icon={<StopCircle className="w-3.5 h-3.5" />} onClick={handleEndGame}>
            End
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-6">
        <div className="flex-1">
          <Card padding="lg">
            <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
              {question.text}
            </h2>
            <p className="text-sm text-slate-400 mt-2">{question.points} points</p>
          </Card>
        </div>
        <Timer timeRemaining={timeRemaining} totalTime={question.timeLimit} size={state === 'QUESTION_ACTIVE' ? 'lg' : 'md'} />
      </div>

      {state === 'ANSWER_REVEAL' && (
        <div className="space-y-4 fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {question.answers.map((ans, i) => (
              <div
                key={ans.id}
                className={`p-4 rounded-xl border-2 flex items-center gap-3 ${
                  ans.isCorrect
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-600 bg-slate-800/30 opacity-60'
                }`}
              >
                <span className="text-base font-medium">{ans.text}</span>
                {ans.isCorrect && <span className="text-emerald-400 text-sm font-semibold ml-auto">Correct</span>}
              </div>
            ))}
          </div>

          {distribution.length > 0 && (
            <Card>
              <h3 className="text-sm font-medium text-slate-400 mb-3">Answer Distribution</h3>
              <div className="space-y-2">
                {distribution.map((d, i) => (
                  <div key={d.answerId} className="flex items-center gap-3">
                    <span className="text-sm text-slate-300 w-32 truncate">{d.text}</span>
                    <div className="flex-1 h-8 bg-slate-700/30 rounded-lg overflow-hidden">
                      <div
                        className={`h-full ${d.isCorrect ? 'bg-emerald-500' : answerBarColors[i]} rounded-lg transition-all duration-500 flex items-center px-2`}
                        style={{ width: `${Math.max((d.count / maxCount) * 100, 8)}%` }}
                      >
                        <span className="text-xs font-bold text-white">{d.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

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
              Next Question
            </Button>
          </div>
        </div>
      )}

      {state === 'QUESTION_ACTIVE' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {question.answers.map((ans, i) => {
            const bgColors = ['bg-red-500/15 border-red-500/30', 'bg-blue-500/15 border-blue-500/30', 'bg-emerald-500/15 border-emerald-500/30', 'bg-yellow-500/15 border-yellow-500/30', 'bg-purple-500/15 border-purple-500/30', 'bg-cyan-500/15 border-cyan-500/30'];
            return (
              <div key={ans.id} className={`p-4 rounded-xl border-2 ${bgColors[i]} flex items-center gap-3`}>
                <span className="text-base font-medium text-white">{ans.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
