import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Play, GripVertical, Check
} from 'lucide-react';
import { api, type Question, type QuizFull } from '../services/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input, Textarea } from '../components/Input';

interface EditableAnswer {
  id?: string;
  text: string;
  isCorrect: boolean;
}

interface EditableQuestion {
  id?: string;
  type: 'multiple-choice' | 'true-false';
  text: string;
  timeLimit: number;
  points: number;
  explanation: string;
  answers: EditableAnswer[];
}

function newMCQuestion(): EditableQuestion {
  return {
    type: 'multiple-choice',
    text: '',
    timeLimit: 30,
    points: 1000,
    explanation: '',
    answers: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  };
}

function newTFQuestion(): EditableQuestion {
  return {
    type: 'true-false',
    text: '',
    timeLimit: 30,
    points: 1000,
    explanation: '',
    answers: [
      { text: 'True', isCorrect: true },
      { text: 'False', isCorrect: false },
    ],
  };
}

function questionFromApi(q: Question): EditableQuestion {
  return {
    id: q.id,
    type: q.type,
    text: q.text,
    timeLimit: q.timeLimit,
    points: q.points,
    explanation: q.explanation || '',
    answers: q.answers.map((a) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect })),
  };
}

export function QuizEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [quizId, setQuizId] = useState<string | null>(id || null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(isEditing);

  useEffect(() => {
    if (id) {
      api.getQuiz(id).then((quiz: QuizFull) => {
        setTitle(quiz.title);
        setDescription(quiz.description || '');
        setCategory(quiz.category || '');
        setQuestions(quiz.questions.map(questionFromApi));
        setQuizId(quiz.id);
        setLoading(false);
      }).catch(() => {
        navigate('/host');
      });
    }
  }, [id, navigate]);

  const validate = useCallback((): string[] => {
    const errs: string[] = [];
    if (!title.trim()) errs.push('Quiz title is required');
    if (questions.length === 0) errs.push('Add at least one question');
    questions.forEach((q, i) => {
      if (!q.text.trim()) errs.push(`Question ${i + 1}: text is required`);
      if (q.answers.every((a) => !a.text.trim())) errs.push(`Question ${i + 1}: answers are required`);
      if (!q.answers.some((a) => a.isCorrect)) errs.push(`Question ${i + 1}: select a correct answer`);
      const filledAnswers = q.answers.filter((a) => a.text.trim());
      if (filledAnswers.length < 2) errs.push(`Question ${i + 1}: at least 2 answers are required`);
    });
    return errs;
  }, [title, questions]);

  const handleSave = async () => {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setSaving(true);

    try {
      let currentQuizId = quizId;

      if (!currentQuizId) {
        const quiz = await api.createQuiz({ title, description: description || undefined, category: category || undefined });
        currentQuizId = quiz.id;
        setQuizId(quiz.id);
      } else {
        await api.updateQuiz(currentQuizId, { title, description: description || undefined, category: category || undefined });
      }

      const existingQuiz = currentQuizId === id ? await api.getQuiz(currentQuizId) : null;
      const existingQuestionIds = new Set(existingQuiz?.questions.map((q) => q.id) || []);

      for (const q of questions) {
        const data = {
          type: q.type,
          text: q.text,
          timeLimit: q.timeLimit,
          points: q.points,
          explanation: q.explanation || undefined,
          answers: q.answers.filter((a) => a.text.trim()).map((a) => ({
            id: a.id,
            text: a.text,
            isCorrect: a.isCorrect,
          })),
        };

        if (q.id && existingQuestionIds.has(q.id)) {
          await api.updateQuestion(q.id, data);
          existingQuestionIds.delete(q.id);
        } else {
          const created = await api.addQuestion(currentQuizId, data);
          q.id = created.id;
        }
      }

      for (const removedId of existingQuestionIds) {
        await api.deleteQuestion(removedId);
      }

      const questionIds = questions.map((q) => q.id).filter(Boolean) as string[];
      if (questionIds.length > 0) {
        await api.reorderQuestions(currentQuizId, questionIds);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);

      if (!id) {
        navigate(`/host/quiz/${currentQuizId}`, { replace: true });
      }
    } catch (err) {
      setErrors([(err as Error).message]);
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = (type: 'multiple-choice' | 'true-false') => {
    const q = type === 'true-false' ? newTFQuestion() : newMCQuestion();
    setQuestions((prev) => [...prev, q]);
    setSelectedIdx(questions.length);
  };

  const deleteQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    if (selectedIdx >= questions.length - 1) setSelectedIdx(Math.max(0, questions.length - 2));
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= questions.length) return;
    setQuestions((prev) => {
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
    setSelectedIdx(newIdx);
  };

  const updateQuestion = (idx: number, updates: Partial<EditableQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, ...updates } : q));
  };

  const updateAnswer = (qIdx: number, aIdx: number, updates: Partial<EditableAnswer>) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const answers = q.answers.map((a, j) => {
        if (j !== aIdx) return updates.isCorrect ? { ...a, isCorrect: false } : a;
        return { ...a, ...updates };
      });
      return { ...q, answers };
    }));
  };

  const addAnswer = (qIdx: number) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx || q.answers.length >= 6) return q;
      return { ...q, answers: [...q.answers, { text: '', isCorrect: false }] };
    }));
  };

  const removeAnswer = (qIdx: number, aIdx: number) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx || q.answers.length <= 2) return q;
      return { ...q, answers: q.answers.filter((_, j) => j !== aIdx) };
    }));
  };

  const selected = questions[selectedIdx];

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-48" />
          <div className="h-64 bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/host')}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <h1 className="text-xl font-bold text-white flex-1">
          {isEditing ? 'Edit Quiz' : 'Create Quiz'}
        </h1>
        <Button
          icon={saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          loading={saving}
          onClick={handleSave}
          variant={saved ? 'success' : 'primary'}
        >
          {saved ? 'Saved' : 'Save'}
        </Button>
      </div>

      {errors.length > 0 && (
        <Card className="bg-red-500/10 border-red-500/30">
          <ul className="text-sm text-red-300 space-y-1">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </Card>
      )}

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" />
          <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Science" />
          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300">Questions ({questions.length})</h2>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => addQuestion('multiple-choice')} title="Add multiple choice">
                <Plus className="w-3.5 h-3.5" /> MC
              </Button>
              <Button size="sm" variant="ghost" onClick={() => addQuestion('true-false')} title="Add true/false">
                <Plus className="w-3.5 h-3.5" /> T/F
              </Button>
            </div>
          </div>

          {questions.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Add your first question</p>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {questions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIdx(i)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    i === selectedIdx
                      ? 'bg-violet-500/20 text-violet-200 border border-violet-500/40'
                      : 'text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  <GripVertical className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  <span className="font-mono text-xs text-slate-500 w-5">{i + 1}</span>
                  <span className="truncate flex-1">{q.text || 'Untitled question'}</span>
                  <span className="text-xs text-slate-500">{q.type === 'true-false' ? 'T/F' : 'MC'}</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          {!selected ? (
            <div className="text-center py-12 text-slate-400">
              <p>Select a question or add a new one</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-300">
                  Question {selectedIdx + 1}
                  <span className="text-slate-500 ml-2">
                    {selected.type === 'true-false' ? 'True/False' : 'Multiple Choice'}
                  </span>
                </h2>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => moveQuestion(selectedIdx, -1)} disabled={selectedIdx === 0}>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => moveQuestion(selectedIdx, 1)} disabled={selectedIdx === questions.length - 1}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteQuestion(selectedIdx)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <Textarea
                label="Question Text"
                value={selected.text}
                onChange={(e) => updateQuestion(selectedIdx, { text: e.target.value })}
                placeholder="Enter your question"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Time Limit</label>
                  <select
                    value={selected.timeLimit}
                    onChange={(e) => updateQuestion(selectedIdx, { timeLimit: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-[#334155] border border-slate-600 rounded-lg text-slate-100 outline-none focus:ring-2 focus:ring-violet-500/50"
                  >
                    {[10, 15, 20, 30, 45, 60, 90, 120].map((t) => (
                      <option key={t} value={t}>{t} seconds</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Points</label>
                  <select
                    value={selected.points}
                    onChange={(e) => updateQuestion(selectedIdx, { points: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-[#334155] border border-slate-600 rounded-lg text-slate-100 outline-none focus:ring-2 focus:ring-violet-500/50"
                  >
                    {[500, 750, 1000, 1500, 2000].map((p) => (
                      <option key={p} value={p}>{p.toLocaleString()} points</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-300">Answers</label>
                  {selected.type === 'multiple-choice' && selected.answers.length < 6 && (
                    <Button size="sm" variant="ghost" onClick={() => addAnswer(selectedIdx)}>
                      <Plus className="w-3 h-3" /> Add
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {selected.answers.map((ans, aIdx) => {
                    const answerColors = ['border-red-500/40', 'border-blue-500/40', 'border-emerald-500/40', 'border-yellow-500/40', 'border-purple-500/40', 'border-cyan-500/40'];
                    return (
                      <div key={aIdx} className={`flex items-center gap-2 p-2 rounded-lg border ${ans.isCorrect ? 'border-emerald-500/60 bg-emerald-500/5' : answerColors[aIdx] + ' bg-slate-800/30'}`}>
                        <input
                          type="radio"
                          name={`correct-${selectedIdx}`}
                          checked={ans.isCorrect}
                          onChange={() => updateAnswer(selectedIdx, aIdx, { isCorrect: true })}
                          className="w-4 h-4 accent-emerald-500"
                          title="Mark as correct"
                        />
                        <input
                          type="text"
                          value={ans.text}
                          onChange={(e) => updateAnswer(selectedIdx, aIdx, { text: e.target.value })}
                          placeholder={`Answer ${aIdx + 1}`}
                          disabled={selected.type === 'true-false'}
                          className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder-slate-500 text-sm"
                        />
                        {ans.isCorrect && <Check className="w-4 h-4 text-emerald-400" />}
                        {selected.type === 'multiple-choice' && selected.answers.length > 2 && (
                          <button onClick={() => removeAnswer(selectedIdx, aIdx)} className="p-1 text-slate-400 hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Textarea
                label="Explanation (shown after answer reveal)"
                value={selected.explanation}
                onChange={(e) => updateQuestion(selectedIdx, { explanation: e.target.value })}
                placeholder="Optional explanation"
              />
            </div>
          )}
        </Card>
      </div>

      {quizId && questions.length > 0 && (
        <div className="flex justify-end">
          <Button
            icon={<Play className="w-4 h-4" />}
            variant="success"
            onClick={() => {
              handleSave().then(() => {
                if (quizId) navigate(`/host`);
              });
            }}
          >
            Save & Host This Quiz
          </Button>
        </div>
      )}
    </div>
  );
}
