import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Beaker, Target, CheckCircle2, HelpCircle,
  Clock, Import, ChevronDown, ChevronRight, FileText, MessageSquare,
  Star, AlertCircle, Loader2,
} from 'lucide-react';
import { api, type PackFull, type QuizSummary } from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-500/20 text-emerald-300',
  intermediate: 'bg-yellow-500/20 text-yellow-300',
  advanced: 'bg-red-500/20 text-red-300',
  mixed: 'bg-violet-500/20 text-violet-300',
  easy: 'bg-emerald-500/20 text-emerald-300',
  medium: 'bg-yellow-500/20 text-yellow-300',
  hard: 'bg-red-500/20 text-red-300',
};

const NARRATOR_MOOD_EMOJI: Record<string, string> = {
  neutral: '',
  happy: '',
  thinking: '',
  excited: '',
  serious: '',
};

export function PackDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [pack, setPack] = useState<PackFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [targetQuizId, setTargetQuizId] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null);
  const [showImport, setShowImport] = useState(false);

  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [expandedScenes, setExpandedScenes] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.getPack(slug)
      .then(setPack)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    api.getQuizzes().then(setQuizzes).catch(() => {});
  }, []);

  const toggleQuestion = (id: string) => {
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!pack) return;
    if (selectedQuestionIds.size === pack.questions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(pack.questions.map(q => q.id)));
    }
  };

  const handleImport = async () => {
    if (!pack || !targetQuizId || selectedQuestionIds.size === 0) return;
    setImporting(true);
    try {
      const result = await api.importPackQuestions(pack.id, [...selectedQuestionIds], targetQuizId);
      setImportResult(result);
      setSelectedQuestionIds(new Set());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  };

  const toggleChapter = (id: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-white mb-1">Failed to load pack</h2>
        <p className="text-sm text-slate-400">{error || 'Pack not found'}</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/packs')}>
          Back to Packs
        </Button>
      </div>
    );
  }

  const isCulture = pack.category === 'culture';
  const accentColor = isCulture ? 'amber' : 'cyan';
  const Icon = isCulture ? BookOpen : Beaker;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(`/packs?category=${pack.category}`)}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to {isCulture ? 'Culture & Stories' : 'STEM & Exam Practice'}
        </button>

        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-xl bg-${accentColor}-500/10 text-${accentColor}-400 flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{pack.title}</h1>
              {pack.difficulty && (
                <span className={`text-xs px-2.5 py-1 rounded-full ${DIFFICULTY_COLORS[pack.difficulty] ?? DIFFICULTY_COLORS.mixed}`}>
                  {pack.difficulty}
                </span>
              )}
            </div>
            <p className="text-slate-400 mt-1">{pack.description}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3" /> {pack.questions.length} questions</span>
              {pack.estimatedDurationMin && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{pack.estimatedDurationMin} min</span>}
              {pack.subject && <span className={`px-2 py-0.5 rounded-full bg-${accentColor}-500/10 text-${accentColor}-300`}>{pack.subject}</span>}
              {pack.curriculum && <span className="px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300">{pack.curriculum}</span>}
              {pack.gradeLevel && <span className="text-slate-400">Grade: {pack.gradeLevel}</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {pack.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Objectives */}
      {pack.objectives.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-violet-400" /> Learning Objectives
          </h2>
          <ul className="space-y-2">
            {pack.objectives.map(obj => (
              <li key={obj.id} className="flex items-start gap-2 text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                {obj.text}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Chapters */}
      {pack.chapters.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-violet-400" /> Chapters ({pack.chapters.length})
          </h2>
          {pack.chapters.map(chapter => {
            const isExpanded = expandedChapters.has(chapter.id);
            return (
              <Card key={chapter.id} className="cursor-pointer" onClick={() => toggleChapter(chapter.id)}>
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-white">{chapter.title}</h3>
                    {chapter.description && !isExpanded && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{chapter.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 capitalize">{chapter.chapterType}</span>
                </div>
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    {chapter.description && <p className="text-sm text-slate-400 mb-2">{chapter.description}</p>}
                    {chapter.contentText && (
                      <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                        {chapter.contentText}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Griot Mode Scenes */}
      {pack.scenes.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setExpandedScenes(!expandedScenes)}
            className="w-full text-left text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4 text-amber-400" />
            Griot Mode Scenes ({pack.scenes.length})
            {expandedScenes ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          {expandedScenes && (
            <div className="space-y-2">
              {pack.scenes.map((scene, i) => (
                <Card key={scene.id}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-white">{scene.title}</h3>
                        {scene.narratorMood !== 'neutral' && (
                          <span className="text-xs text-slate-500 capitalize">({scene.narratorMood})</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-1 whitespace-pre-line">{scene.narratorText}</p>
                      {scene.questionId && (
                        <p className="text-xs text-violet-400 mt-2 flex items-center gap-1">
                          <HelpCircle className="w-3 h-3" /> Has linked question
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-violet-400" /> Questions ({pack.questions.length})
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {selectedQuestionIds.size === pack.questions.length ? 'Deselect All' : 'Select All'}
            </Button>
            {selectedQuestionIds.size > 0 && (
              <Button
                variant="primary"
                size="sm"
                icon={<Import className="w-4 h-4" />}
                onClick={() => setShowImport(true)}
              >
                Import {selectedQuestionIds.size} to Quiz
              </Button>
            )}
          </div>
        </div>

        {pack.questions.map((q, i) => {
          const isSelected = selectedQuestionIds.has(q.id);
          return (
            <Card
              key={q.id}
              className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-violet-500/50 bg-violet-500/5' : ''}`}
              onClick={() => toggleQuestion(q.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                  isSelected ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-600'
                }`}>
                  {isSelected && <CheckCircle2 className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-white font-medium">
                      <span className="text-slate-500 mr-1.5">Q{i + 1}.</span>
                      {q.text}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {q.difficulty && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${DIFFICULTY_COLORS[q.difficulty] ?? ''}`}>
                          {q.difficulty}
                        </span>
                      )}
                      {q.mathNotation && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300">math</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-2">
                    {q.answers.map(a => (
                      <div
                        key={a.id}
                        className={`text-xs px-2 py-1.5 rounded ${
                          a.isCorrect
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-700/30 text-slate-400'
                        }`}
                      >
                        {a.isCorrect && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                        {a.text}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <p className="text-xs text-slate-500 mt-2 italic">
                      {q.explanation}
                    </p>
                  )}
                  {q.topic && (
                    <span className="inline-block text-xs text-slate-500 mt-1">Topic: {q.topic}</span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setShowImport(false)}>
          <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Import Questions to Quiz</h2>
            <p className="text-sm text-slate-400 mb-4">
              {selectedQuestionIds.size} question{selectedQuestionIds.size !== 1 ? 's' : ''} selected.
              Choose a quiz to import them into:
            </p>

            {importResult ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                <p className="text-white font-medium">Imported {importResult.imported} questions</p>
                <p className="text-sm text-slate-400 mt-1">Questions are now in your quiz</p>
                <Button variant="primary" className="mt-4" onClick={() => { setShowImport(false); setImportResult(null); }}>
                  Done
                </Button>
              </div>
            ) : (
              <>
                {quizzes.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-400 mb-3">No quizzes yet. Create one first.</p>
                    <Button variant="primary" onClick={() => navigate('/host/quiz/new')}>Create Quiz</Button>
                  </div>
                ) : (
                  <>
                    <select
                      value={targetQuizId}
                      onChange={e => setTargetQuizId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#334155] border border-slate-600 rounded-lg text-slate-100 text-sm outline-none mb-4"
                    >
                      <option value="">Select a quiz...</option>
                      {quizzes.map(q => (
                        <option key={q.id} value={q.id}>{q.title} ({q.questionCount} questions)</option>
                      ))}
                    </select>
                    <div className="flex gap-3">
                      <Button variant="ghost" className="flex-1" onClick={() => setShowImport(false)}>Cancel</Button>
                      <Button
                        variant="primary"
                        className="flex-1"
                        disabled={!targetQuizId}
                        loading={importing}
                        onClick={handleImport}
                      >
                        Import
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      {/* Pack meta footer */}
      <div className="text-xs text-slate-600 border-t border-slate-800 pt-4 flex flex-wrap gap-4">
        <span>License: {pack.license}</span>
        <span>Version: {pack.version}</span>
        {pack.author && <span>Author: {pack.author}</span>}
        {pack.source && <span>Source: {pack.source}</span>}
      </div>
    </div>
  );
}
