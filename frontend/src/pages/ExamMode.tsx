import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle, XCircle, AlertTriangle, ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { api, type PackFull, type PackQuestion } from '../services/api';

type ExamState = 'loading' | 'setup' | 'active' | 'confirming' | 'results';

interface QuestionAnswer {
  answerId: string | null;
  flagged: boolean;
}

export function ExamMode() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<ExamState>('loading');
  const [pack, setPack] = useState<PackFull | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, QuestionAnswer>>(new Map());
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!slug) return;
    api.getPack(slug).then(p => {
      setPack(p);
      setState('setup');
    }).catch(() => setError('Failed to load pack'));
  }, [slug]);

  const totalTime = pack
    ? (pack.estimatedDurationMin ? pack.estimatedDurationMin * 60 : pack.questions.reduce((s, q) => s + q.timeLimit, 0))
    : 0;

  const startExam = () => {
    if (!playerName.trim() || !pack) return;
    const initial = new Map<string, QuestionAnswer>();
    pack.questions.forEach(q => initial.set(q.id, { answerId: null, flagged: false }));
    setAnswers(initial);
    setCurrentIndex(0);
    setTimeLeft(totalTime);
    setStartTime(Date.now());
    setState('active');
  };

  const submitExam = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeTaken(Math.round((Date.now() - startTime) / 1000));
    setState('results');
  }, [startTime]);

  useEffect(() => {
    if (state !== 'active') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          submitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state, submitExam]);

  const selectAnswer = (questionId: string, answerId: string) => {
    setAnswers(prev => {
      const next = new Map(prev);
      const current = next.get(questionId);
      next.set(questionId, { answerId, flagged: current?.flagged ?? false });
      return next;
    });
  };

  const toggleFlag = (questionId: string) => {
    setAnswers(prev => {
      const next = new Map(prev);
      const current = next.get(questionId);
      if (current) next.set(questionId, { ...current, flagged: !current.flagged });
      return next;
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center p-8">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white text-lg mb-4">{error}</p>
          <Button variant="secondary" onClick={() => navigate(-1)}>Go Back</Button>
        </Card>
      </div>
    );
  }

  if (state === 'loading' || !pack) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading exam...</div>
      </div>
    );
  }

  if (state === 'setup') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <Card className="max-w-lg w-full p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-cyan-600 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Timed Exam</h1>
            <p className="text-slate-400">{pack.title}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{pack.questions.length}</p>
              <p className="text-xs text-slate-400">Questions</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{formatTime(totalTime)}</p>
              <p className="text-xs text-slate-400">Time Limit</p>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-lg p-4 text-sm text-slate-300 space-y-1">
            <p>- Answer all questions within the time limit</p>
            <p>- You can flag questions to review later</p>
            <p>- Navigate between questions freely</p>
            <p>- Score of 50% or above is a pass</p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              maxLength={50}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              onKeyDown={e => { if (e.key === 'Enter') startExam(); }}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate(`/packs/${slug}`)} icon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
            <button
              onClick={startExam}
              disabled={!playerName.trim()}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Clock className="w-5 h-5" />
              Start Exam
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const questions = pack.questions;
  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers.get(currentQuestion?.id ?? '');
  const answeredCount = Array.from(answers.values()).filter(a => a.answerId !== null).length;
  const flaggedCount = Array.from(answers.values()).filter(a => a.flagged).length;

  if (state === 'results') {
    return <ExamResults pack={pack} answers={answers} timeTaken={timeTaken} playerName={playerName} onRetry={() => setState('setup')} onBack={() => navigate(`/packs/${slug}`)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Timer bar */}
      <div className="bg-slate-900 border-b border-slate-700/50 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h2 className="text-white font-medium text-sm truncate max-w-[40%]">{pack.title}</h2>
          <div className={`flex items-center gap-2 text-lg font-mono font-bold ${timeLeft < 60 ? 'text-red-400 animate-pulse' : timeLeft < 300 ? 'text-amber-400' : 'text-cyan-400'}`}>
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span>{answeredCount}/{questions.length}</span>
            {flaggedCount > 0 && <span className="text-amber-400"><Flag className="w-3.5 h-3.5 inline" /> {flaggedCount}</span>}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row max-w-5xl mx-auto w-full">
        {/* Question nav grid */}
        <div className="lg:w-48 p-4 lg:border-r border-slate-700/50">
          <div className="flex lg:flex-wrap gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            {questions.map((q, i) => {
              const a = answers.get(q.id);
              let bg = 'bg-slate-700 text-slate-300';
              if (a?.flagged) bg = 'bg-amber-600/30 text-amber-300 ring-1 ring-amber-500/50';
              else if (a?.answerId) bg = 'bg-violet-600/30 text-violet-300 ring-1 ring-violet-500/50';
              if (i === currentIndex) bg += ' ring-2 ring-cyan-400';
              return (
                <button key={q.id} onClick={() => setCurrentIndex(i)}
                  className={`w-9 h-9 min-w-[2.25rem] rounded-lg text-sm font-medium transition-all ${bg}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question area */}
        <div className="flex-1 p-4 lg:p-8 flex flex-col">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm text-slate-500">Question {currentIndex + 1} of {questions.length}</span>
              {currentQuestion?.topic && <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">{currentQuestion.topic}</span>}
            </div>

            <h3 className="text-lg text-white font-medium mb-6 leading-relaxed">{currentQuestion?.text}</h3>

            <div className="space-y-3">
              {currentQuestion?.answers.map(opt => {
                const selected = currentAnswer?.answerId === opt.id;
                return (
                  <button key={opt.id} onClick={() => selectAnswer(currentQuestion.id, opt.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selected
                        ? 'border-cyan-500 bg-cyan-500/10 text-white'
                        : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
                    }`}>
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mr-3 ${selected ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                      {String.fromCharCode(65 + opt.orderIndex)}
                    </span>
                    {opt.text}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom controls */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0} icon={<ChevronLeft className="w-4 h-4" />}>
              Previous
            </Button>

            <button onClick={() => currentQuestion && toggleFlag(currentQuestion.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                currentAnswer?.flagged ? 'bg-amber-600/20 text-amber-300' : 'text-slate-500 hover:text-amber-300'
              }`}>
              <Flag className="w-4 h-4" />
              {currentAnswer?.flagged ? 'Flagged' : 'Flag'}
            </button>

            {currentIndex < questions.length - 1 ? (
              <Button variant="ghost" size="sm" onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
                icon={<ChevronRight className="w-4 h-4" />}>
                Next
              </Button>
            ) : (
              <button onClick={() => setState('confirming')}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors">
                Submit Exam
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      {state === 'confirming' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <Card className="max-w-sm w-full p-6 space-y-4">
            <div className="text-center">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">Submit Exam?</h3>
            </div>
            <div className="text-sm text-slate-300 space-y-1">
              <p>Answered: <span className="text-white font-medium">{answeredCount}</span> of {questions.length}</p>
              {flaggedCount > 0 && <p>Flagged for review: <span className="text-amber-400 font-medium">{flaggedCount}</span></p>}
              {answeredCount < questions.length && (
                <p className="text-amber-400 mt-2">You have {questions.length - answeredCount} unanswered question{questions.length - answeredCount > 1 ? 's' : ''}.</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setState('active')}>Continue</Button>
              <button onClick={submitExam} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2.5 rounded-xl transition-colors">
                Submit
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function ExamResults({ pack, answers, timeTaken, playerName, onRetry, onBack }: {
  pack: PackFull;
  answers: Map<string, QuestionAnswer>;
  timeTaken: number;
  playerName: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  const [recorded, setRecorded] = useState(false);

  const results = pack.questions.map(q => {
    const a = answers.get(q.id);
    const selectedAnswer = q.answers.find(ans => ans.id === a?.answerId);
    const correctAnswer = q.answers.find(ans => ans.isCorrect);
    const isCorrect = selectedAnswer?.isCorrect ?? false;
    return { question: q, selectedAnswer, correctAnswer, isCorrect, flagged: a?.flagged ?? false };
  });

  const correctCount = results.filter(r => r.isCorrect).length;
  const totalPoints = pack.questions.reduce((s, q) => s + q.points, 0);
  const score = results.reduce((s, r) => s + (r.isCorrect ? r.question.points : 0), 0);
  const percentage = pack.questions.length > 0 ? Math.round((correctCount / pack.questions.length) * 100) : 0;
  const passed = percentage >= 50;

  const topicStats = new Map<string, { correct: number; total: number }>();
  results.forEach(r => {
    const topic = r.question.topic || 'General';
    const entry = topicStats.get(topic) || { correct: 0, total: 0 };
    entry.total++;
    if (r.isCorrect) entry.correct++;
    topicStats.set(topic, entry);
  });

  useEffect(() => {
    if (recorded) return;
    const details = results.map(r => ({
      questionId: r.question.id,
      topic: r.question.topic,
      correct: r.isCorrect,
    }));
    api.recordCompletion({
      packId: pack.id,
      playerName,
      mode: 'exam',
      score,
      totalPoints,
      correctAnswers: correctCount,
      totalQuestions: pack.questions.length,
      timeTakenSeconds: timeTaken,
      details: JSON.stringify(details),
    }).catch(() => {});
    setRecorded(true);
  }, [recorded, pack, playerName, score, totalPoints, correctCount, timeTaken, results]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Score header */}
        <Card className="p-8 text-center">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${passed ? 'bg-emerald-600/20' : 'bg-red-600/20'}`}>
            {passed ? <Trophy className="w-10 h-10 text-emerald-400" /> : <XCircle className="w-10 h-10 text-red-400" />}
          </div>
          <h2 className="text-3xl font-bold text-white mb-1">{percentage}%</h2>
          <p className={`text-lg font-medium mb-4 ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
            {passed ? 'PASSED' : 'NOT PASSED'}
          </p>
          <div className="flex justify-center gap-6 text-sm text-slate-400">
            <span><CheckCircle className="w-4 h-4 inline text-emerald-400" /> {correctCount}/{pack.questions.length} correct</span>
            <span><Clock className="w-4 h-4 inline text-cyan-400" /> {formatTime(timeTaken)}</span>
            <span>Score: {score}/{totalPoints}</span>
          </div>
        </Card>

        {/* Topic breakdown */}
        {topicStats.size > 1 && (
          <Card className="p-6">
            <h3 className="text-white font-semibold mb-4">Performance by Topic</h3>
            <div className="space-y-3">
              {Array.from(topicStats.entries()).map(([topic, stats]) => {
                const pct = Math.round((stats.correct / stats.total) * 100);
                return (
                  <div key={topic}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-300">{topic}</span>
                      <span className={pct >= 50 ? 'text-emerald-400' : 'text-red-400'}>{stats.correct}/{stats.total} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct >= 50 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Question review */}
        <Card className="p-6">
          <h3 className="text-white font-semibold mb-4">Question Review</h3>
          <div className="space-y-4">
            {results.map((r, i) => (
              <div key={r.question.id} className={`p-4 rounded-lg border ${r.isCorrect ? 'border-emerald-800/50 bg-emerald-950/20' : 'border-red-800/50 bg-red-950/20'}`}>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-0.5">
                    {r.isCorrect
                      ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                      : <XCircle className="w-5 h-5 text-red-400" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white mb-2">
                      <span className="text-slate-500 mr-1">Q{i + 1}.</span> {r.question.text}
                    </p>
                    {!r.isCorrect && r.selectedAnswer && (
                      <p className="text-sm text-red-300 mb-1">Your answer: {r.selectedAnswer.text}</p>
                    )}
                    {!r.isCorrect && !r.selectedAnswer && (
                      <p className="text-sm text-slate-500 mb-1 italic">Not answered</p>
                    )}
                    {r.correctAnswer && (
                      <p className="text-sm text-emerald-300">Correct: {r.correctAnswer.text}</p>
                    )}
                    {r.question.explanation && (
                      <p className="text-xs text-slate-400 mt-2 italic">{r.question.explanation}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Pack
          </Button>
          <button onClick={onRetry}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
