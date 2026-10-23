import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, History, Users, Calendar, Trophy } from 'lucide-react';
import { api, type SessionSummary } from '../services/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export function GameHistory() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getSessions()
      .then((all) => setSessions(all.filter((s) => s.status === 'FINISHED')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-48" />
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/host')}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-white">Game History</h1>
      </div>

      {sessions.length === 0 ? (
        <Card className="text-center py-12">
          <History className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-300 mb-1">No games yet</h2>
          <p className="text-sm text-slate-400">Completed games will appear here</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Link key={session.id} to={`/host/results/${session.id}`}>
              <Card className="hover:bg-slate-700/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{session.quizTitle}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {session.playerCount} players
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {session.finishedAt ? new Date(session.finishedAt).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">PIN: {session.pin}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
