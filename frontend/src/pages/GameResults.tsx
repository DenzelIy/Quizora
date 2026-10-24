import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, Trophy, BarChart3, Users } from 'lucide-react';
import { api, type SessionResults } from '../services/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Leaderboard } from '../components/Leaderboard';

export function GameResults() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [results, setResults] = useState<SessionResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    api.getSessionResults(sessionId)
      .then(setResults)
      .catch(() => navigate('/host'))
      .finally(() => setLoading(false));
  }, [sessionId, navigate]);

  const handleExport = async () => {
    if (!sessionId) return;
    try {
      const csv = await api.exportSessionCSV(sessionId);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `game-results-${sessionId.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading || !results) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-48" />
          <div className="h-64 bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const leaderboard = results.players.map((p) => ({
    playerId: p.id,
    displayName: p.displayName,
    avatar: p.avatar,
    score: p.score,
    correctAnswers: p.correctAnswers,
    rank: p.rank,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/host')}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{results.session.quizTitle}</h1>
          <p className="text-sm text-slate-400">
            {results.players.length} players · {results.questionStats.length} questions
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h2 className="text-lg font-semibold text-white">Final Rankings</h2>
        </div>
        <Leaderboard entries={leaderboard} showPodium />
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-semibold text-white">Question Breakdown</h2>
        </div>
        <div className="space-y-4">
          {results.questionStats.map((stat, i) => {
            const accuracy = stat.totalCount > 0 ? Math.round((stat.correctCount / stat.totalCount) * 100) : 0;
            const maxCount = Math.max(...stat.answerDistribution.map((d) => d.count), 1);
            return (
              <div key={stat.questionId} className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white">
                    <span className="text-slate-500 mr-2">Q{i + 1}</span>
                    {stat.questionText}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                    stat.totalCount === 0 ? 'bg-slate-600/30 text-slate-400' :
                    accuracy >= 70 ? 'bg-emerald-500/20 text-emerald-300' :
                    accuracy >= 40 ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {stat.totalCount === 0 ? 'No answers' : `${accuracy}% correct`}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {stat.answerDistribution.map((d) => (
                    <div key={d.answerId} className="flex items-center gap-2 text-xs">
                      <span className={`w-24 truncate ${d.isCorrect ? 'text-emerald-300 font-medium' : 'text-slate-400'}`}>
                        {d.text}
                      </span>
                      <div className="flex-1 h-5 bg-slate-700/30 rounded overflow-hidden">
                        <div
                          className={`h-full rounded transition-all duration-500 flex items-center px-1.5 ${d.isCorrect ? 'bg-emerald-500' : 'bg-slate-600'}`}
                          style={{ width: `${Math.max((d.count / maxCount) * 100, 5)}%` }}
                        >
                          <span className="text-xs text-white font-medium">{d.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">Player Statistics</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700">
                <th className="text-left py-2 font-medium">Rank</th>
                <th className="text-left py-2 font-medium">Player</th>
                <th className="text-right py-2 font-medium">Score</th>
                <th className="text-right py-2 font-medium">Correct</th>
                <th className="text-right py-2 font-medium">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {results.players.map((p) => (
                <tr key={p.id} className="border-b border-slate-700/50">
                  <td className="py-2 text-slate-400">#{p.rank}</td>
                  <td className="py-2 text-white font-medium">
                    <span className="mr-2">{p.avatar ?? '🙂'}</span>
                    {p.displayName}
                  </td>
                  <td className="py-2 text-right text-violet-300">{p.score.toLocaleString()}</td>
                  <td className="py-2 text-right">{p.correctAnswers}/{p.totalAnswers}</td>
                  <td className="py-2 text-right text-slate-400">
                    {p.totalAnswers > 0 ? Math.round((p.correctAnswers / p.totalAnswers) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
