import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Play, Edit, Trash2, Copy, Wifi, BookOpen } from 'lucide-react';
import { api, type QuizSummary, type NetworkInfo } from '../services/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { socket, connectSocket } from '../services/socket';

export function HostDashboard() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.getQuizzes().then(setQuizzes),
      api.getNetworkInfo().then(setNetworkInfo),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteQuiz(id);
      setQuizzes((q) => q.filter((quiz) => quiz.id !== id));
      setDeleteId(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const quiz = await api.duplicateQuiz(id);
      setQuizzes((q) => [quiz, ...q]);
    } catch (err) {
      console.error('Duplicate failed:', err);
    }
  };

  const handleHostGame = async (quizId: string) => {
    setStartingId(quizId);
    try {
      await connectSocket();
      socket.emit('host:create-session', { quizId }, (response: { success: boolean; sessionId?: string; error?: string }) => {
        setStartingId(null);
        if (response.success && response.sessionId) {
          navigate(`/host/lobby/${response.sessionId}`);
        } else {
          alert(response.error || 'Failed to create session');
        }
      });
    } catch {
      setStartingId(null);
      alert('Could not connect to server');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-slate-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">My Quizzes</h1>
        <Link to="/host/quiz/new">
          <Button icon={<Plus className="w-4 h-4" />}>New Quiz</Button>
        </Link>
      </div>

      {networkInfo && networkInfo.interfaces.length > 0 && (
        <Card padding="sm">
          <div className="flex items-start gap-2">
            <Wifi className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-cyan-300">Network Addresses</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Students can join at: {networkInfo.interfaces.map((iface) => (
                  <span key={iface.address} className="font-mono text-slate-300 ml-1">
                    http://{iface.address}:{networkInfo.port}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </Card>
      )}

      {quizzes.length === 0 ? (
        <Card className="text-center py-16">
          <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-300 mb-2">No quizzes yet</h2>
          <p className="text-sm text-slate-400 mb-6">Create your first quiz to get started</p>
          <Link to="/host/quiz/new">
            <Button icon={<Plus className="w-4 h-4" />}>Create Quiz</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} padding="lg" className="flex flex-col">
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-white">{quiz.title}</h3>
                  {quiz.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 whitespace-nowrap">
                      {quiz.category}
                    </span>
                  )}
                </div>
                {quiz.description && (
                  <p className="text-sm text-slate-400 mb-3 line-clamp-2">{quiz.description}</p>
                )}
                <p className="text-xs text-slate-500">
                  {quiz.questionCount} question{quiz.questionCount !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-700/50">
                <Button
                  size="sm"
                  icon={<Play className="w-3.5 h-3.5" />}
                  loading={startingId === quiz.id}
                  onClick={() => handleHostGame(quiz.id)}
                  disabled={quiz.questionCount === 0}
                >
                  Host
                </Button>
                <Link to={`/host/quiz/${quiz.id}`}>
                  <Button size="sm" variant="ghost" icon={<Edit className="w-3.5 h-3.5" />}>
                    Edit
                  </Button>
                </Link>
                <Button size="sm" variant="ghost" icon={<Copy className="w-3.5 h-3.5" />} onClick={() => handleDuplicate(quiz.id)}>
                  Copy
                </Button>
                {deleteId === quiz.id ? (
                  <div className="flex items-center gap-1 ml-auto">
                    <Button size="sm" variant="danger" onClick={() => handleDelete(quiz.id)}>Yes</Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteId(null)}>No</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setDeleteId(quiz.id)} className="ml-auto text-slate-400 hover:text-red-400">
                    Delete
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
