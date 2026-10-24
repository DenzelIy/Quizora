import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BookOpen, Plus, Trash2, ChevronUp, ChevronDown, Save, Eye,
  Smile, Brain, Flame, AlertTriangle, Minus, Loader2, ArrowLeft,
} from 'lucide-react';
import { api, type PackFull } from '../services/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input, Textarea } from '../components/Input';
import { Narrator, type NarratorMood } from '../components/Narrator';

interface SceneAnswer {
  text: string;
  isCorrect: boolean;
}

interface SceneQuestion {
  text: string;
  type: 'multiple-choice' | 'true-false';
  timeLimit: number;
  points: number;
  explanation: string;
  answers: SceneAnswer[];
}

interface SceneData {
  title: string;
  narratorText: string;
  narratorMood: NarratorMood;
  question?: SceneQuestion;
}

const MOOD_OPTIONS: { value: NarratorMood; label: string; color: string; icon: typeof Smile }[] = [
  { value: 'neutral', label: 'Neutral', color: 'text-violet-400', icon: Minus },
  { value: 'happy', label: 'Happy', color: 'text-amber-400', icon: Smile },
  { value: 'thinking', label: 'Thinking', color: 'text-cyan-400', icon: Brain },
  { value: 'excited', label: 'Excited', color: 'text-red-400', icon: Flame },
  { value: 'serious', label: 'Serious', color: 'text-slate-400', icon: AlertTriangle },
];

function emptyAnswer(): SceneAnswer {
  return { text: '', isCorrect: false };
}

function emptyQuestion(): SceneQuestion {
  return {
    text: '',
    type: 'multiple-choice',
    timeLimit: 20,
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

function emptyScene(): SceneData {
  return { title: '', narratorText: '', narratorMood: 'neutral' };
}

export function StoryEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'culture' | 'stem'>('culture');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced' | 'mixed'>('intermediate');
  const [gradeLevel, setGradeLevel] = useState('');
  const [tags, setTags] = useState('');
  const [objectives, setObjectives] = useState<string[]>(['']);
  const [scenes, setScenes] = useState<SceneData[]>([emptyScene()]);
  const [activeScene, setActiveScene] = useState(0);

  const [saving, setSaving] = useState(false);
  const [loadingPack, setLoadingPack] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoadingPack(true);
    api.getPack(id)
      .then((pack: PackFull) => {
        setTitle(pack.title);
        setDescription(pack.description);
        setCategory(pack.category);
        setSubject(pack.subject ?? '');
        setDifficulty((pack.difficulty as 'beginner' | 'intermediate' | 'advanced' | 'mixed') || 'intermediate');
        setGradeLevel(pack.gradeLevel ?? '');
        setTags(pack.tags.join(', '));
        setObjectives(pack.objectives.length > 0 ? pack.objectives.map(o => o.text) : ['']);

        const loadedScenes: SceneData[] = pack.scenes.map(s => {
          const q = s.questionId ? pack.questions.find(pq => pq.id === s.questionId) : undefined;
          return {
            title: s.title,
            narratorText: s.narratorText,
            narratorMood: s.narratorMood as NarratorMood,
            question: q ? {
              text: q.text,
              type: q.type,
              timeLimit: q.timeLimit,
              points: q.points,
              explanation: q.explanation ?? '',
              answers: q.answers.map(a => ({ text: a.text, isCorrect: a.isCorrect })),
            } : undefined,
          };
        });
        setScenes(loadedScenes.length > 0 ? loadedScenes : [emptyScene()]);
      })
      .catch(() => setError('Failed to load pack'))
      .finally(() => setLoadingPack(false));
  }, [id]);

  const updateScene = useCallback((index: number, patch: Partial<SceneData>) => {
    setScenes(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));
  }, []);

  const moveScene = useCallback((index: number, direction: -1 | 1) => {
    setScenes(prev => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setActiveScene(prev => {
      const target = prev + direction;
      return target >= 0 && target < scenes.length ? target : prev;
    });
  }, [scenes.length]);

  const addScene = useCallback(() => {
    setScenes(prev => [...prev, emptyScene()]);
    setActiveScene(scenes.length);
  }, [scenes.length]);

  const removeScene = useCallback((index: number) => {
    if (scenes.length <= 1) return;
    setScenes(prev => prev.filter((_, i) => i !== index));
    setActiveScene(prev => Math.min(prev, scenes.length - 2));
  }, [scenes.length]);

  const toggleQuestion = useCallback((index: number) => {
    setScenes(prev => prev.map((s, i) => {
      if (i !== index) return s;
      return s.question ? { ...s, question: undefined } : { ...s, question: emptyQuestion() };
    }));
  }, []);

  const updateAnswer = useCallback((sceneIndex: number, answerIndex: number, patch: Partial<SceneAnswer>) => {
    setScenes(prev => prev.map((s, si) => {
      if (si !== sceneIndex || !s.question) return s;
      const answers = s.question.answers.map((a, ai) => {
        if (ai !== answerIndex) {
          if (patch.isCorrect) return { ...a, isCorrect: false };
          return a;
        }
        return { ...a, ...patch };
      });
      return { ...s, question: { ...s.question, answers } };
    }));
  }, []);

  const buildPayload = () => ({
    title,
    description,
    category,
    subject: subject || undefined,
    difficulty,
    gradeLevel: gradeLevel || undefined,
    tags,
    objectives: objectives.filter(o => o.trim()),
    scenes: scenes.map(s => ({
      title: s.title || 'Untitled Scene',
      narratorText: s.narratorText,
      narratorMood: s.narratorMood,
      question: s.question ? {
        text: s.question.text,
        type: s.question.type,
        timeLimit: s.question.timeLimit,
        points: s.question.points,
        explanation: s.question.explanation || undefined,
        answers: s.question.answers.filter(a => a.text.trim()),
      } : undefined,
    })),
  });

  const handleSave = async () => {
    setError('');
    if (!title.trim()) { setError('Title is required'); return; }
    if (scenes.every(s => !s.narratorText.trim())) { setError('At least one scene needs narrator text'); return; }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEditing && id) {
        await api.updatePack(id, payload);
      } else {
        await api.createPack(payload);
      }
      navigate('/packs');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    setError('');
    if (!title.trim()) { setError('Title is required'); return; }
    if (scenes.every(s => !s.narratorText.trim())) { setError('At least one scene needs narrator text'); return; }

    setSaving(true);
    try {
      const payload = buildPayload();
      let pack: PackFull;
      if (isEditing && id) {
        pack = await api.updatePack(id, payload);
      } else {
        pack = await api.createPack(payload);
      }
      navigate(`/griot/${pack.slug}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loadingPack) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto mb-2" />
        <p className="text-slate-400">Loading pack...</p>
      </div>
    );
  }

  const currentScene = scenes[activeScene];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/packs')} icon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isEditing ? 'Edit Story Pack' : 'Create Story Pack'}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handlePreview} loading={saving} icon={<Eye className="w-4 h-4" />}>
            Preview
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving} icon={<Save className="w-4 h-4" />}>
            {isEditing ? 'Update Pack' : 'Save Pack'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Pack Metadata */}
      <Card>
        <h2 className="text-lg font-semibold text-white mb-4">Pack Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. The Tortoise and the Birds" />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this story about?" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as 'culture' | 'stem')}
              className="w-full px-3 py-2.5 bg-[#334155] border border-slate-600 rounded-lg text-slate-100 outline-none focus:border-violet-500"
            >
              <option value="culture">Culture & Stories</option>
              <option value="stem">STEM & Exam Practice</option>
            </select>
          </div>
          <Input label="Subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. History, Physics" />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Difficulty</label>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value as 'beginner' | 'intermediate' | 'advanced' | 'mixed')}
              className="w-full px-3 py-2.5 bg-[#334155] border border-slate-600 rounded-lg text-slate-100 outline-none focus:border-violet-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <Input label="Grade Level" value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} placeholder="e.g. JSS 1-3" />
          <div className="sm:col-span-2">
            <Input label="Tags (comma-separated)" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. folklore, animals, wisdom" />
          </div>
        </div>
      </Card>

      {/* Learning Objectives */}
      <Card>
        <h2 className="text-lg font-semibold text-white mb-4">Learning Objectives</h2>
        <div className="space-y-2">
          {objectives.map((obj, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={obj}
                onChange={e => setObjectives(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                placeholder={`Objective ${i + 1}`}
                className="flex-1 px-3 py-2 bg-[#334155] border border-slate-600 rounded-lg text-slate-100 text-sm outline-none focus:border-violet-500"
              />
              <button
                onClick={() => setObjectives(prev => prev.filter((_, j) => j !== i))}
                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                disabled={objectives.length <= 1}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setObjectives(prev => [...prev, ''])} icon={<Plus className="w-4 h-4" />}>
            Add Objective
          </Button>
        </div>
      </Card>

      {/* Scenes Editor + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scene List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Scenes ({scenes.length})</h2>
            <Button variant="ghost" size="sm" onClick={addScene} icon={<Plus className="w-4 h-4" />}>
              Add Scene
            </Button>
          </div>

          {scenes.map((scene, i) => (
            <Card
              key={i}
              className={`cursor-pointer transition-all ${activeScene === i ? 'ring-2 ring-amber-500/50 border-amber-500/30' : ''}`}
              onClick={() => setActiveScene(i)}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 bg-slate-700/50 rounded-full w-6 h-6 flex items-center justify-center">
                    {i + 1}
                  </span>
                  <input
                    value={scene.title}
                    onChange={e => updateScene(i, { title: e.target.value })}
                    placeholder="Scene title"
                    className="bg-transparent text-white font-medium outline-none placeholder-slate-500 text-sm"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={e => { e.stopPropagation(); moveScene(i, -1); }} disabled={i === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-30">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); moveScene(i, 1); }} disabled={i === scenes.length - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); removeScene(i); }} disabled={scenes.length <= 1} className="p-1 text-slate-400 hover:text-red-400 disabled:opacity-30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <textarea
                value={scene.narratorText}
                onChange={e => updateScene(i, { narratorText: e.target.value })}
                placeholder="What does the narrator say in this scene?"
                rows={4}
                className="w-full px-3 py-2 bg-[#334155] border border-slate-600 rounded-lg text-slate-100 text-sm outline-none focus:border-amber-500 resize-y mb-3"
                onClick={e => e.stopPropagation()}
              />

              {/* Mood Selector */}
              <div className="flex flex-wrap items-center gap-2 mb-3" onClick={e => e.stopPropagation()}>
                <span className="text-xs text-slate-400">Mood:</span>
                {MOOD_OPTIONS.map(mood => {
                  const Icon = mood.icon;
                  return (
                    <button
                      key={mood.value}
                      onClick={() => updateScene(i, { narratorMood: mood.value })}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                        scene.narratorMood === mood.value
                          ? `${mood.color} bg-slate-700`
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {mood.label}
                    </button>
                  );
                })}
              </div>

              {/* Question Toggle */}
              <div onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => toggleQuestion(i)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    scene.question
                      ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                      : 'bg-slate-700/50 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {scene.question ? '✓ Question Attached' : '+ Attach Question'}
                </button>

                {scene.question && (
                  <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 space-y-3">
                    <input
                      value={scene.question.text}
                      onChange={e => updateScene(i, {
                        question: { ...scene.question!, text: e.target.value },
                      })}
                      placeholder="Question text"
                      className="w-full px-3 py-2 bg-[#334155] border border-slate-600 rounded-lg text-slate-100 text-sm outline-none focus:border-amber-500"
                    />

                    <div className="space-y-2">
                      {scene.question.answers.map((answer, ai) => (
                        <div key={ai} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${i}`}
                            checked={answer.isCorrect}
                            onChange={() => updateAnswer(i, ai, { isCorrect: true })}
                            className="accent-amber-500"
                          />
                          <input
                            value={answer.text}
                            onChange={e => updateAnswer(i, ai, { text: e.target.value })}
                            placeholder={`Option ${ai + 1}`}
                            className={`flex-1 px-3 py-1.5 bg-[#334155] border rounded-lg text-sm outline-none ${
                              answer.isCorrect ? 'border-emerald-500/50 text-emerald-200' : 'border-slate-600 text-slate-100'
                            }`}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-slate-400 mb-1">Time (sec)</label>
                        <input
                          type="number"
                          value={scene.question.timeLimit}
                          onChange={e => updateScene(i, {
                            question: { ...scene.question!, timeLimit: parseInt(e.target.value) || 20 },
                          })}
                          min={5} max={300}
                          className="w-full px-2 py-1.5 bg-[#334155] border border-slate-600 rounded-lg text-slate-100 text-sm outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-slate-400 mb-1">Points</label>
                        <input
                          type="number"
                          value={scene.question.points}
                          onChange={e => updateScene(i, {
                            question: { ...scene.question!, points: parseInt(e.target.value) || 1000 },
                          })}
                          min={0} max={10000}
                          className="w-full px-2 py-1.5 bg-[#334155] border border-slate-600 rounded-lg text-slate-100 text-sm outline-none"
                        />
                      </div>
                    </div>

                    <input
                      value={scene.question.explanation}
                      onChange={e => updateScene(i, {
                        question: { ...scene.question!, explanation: e.target.value },
                      })}
                      placeholder="Explanation (shown after answering)"
                      className="w-full px-3 py-1.5 bg-[#334155] border border-slate-600 rounded-lg text-slate-100 text-sm outline-none"
                    />
                  </div>
                )}
              </div>
            </Card>
          ))}

          <Button variant="ghost" size="sm" onClick={addScene} icon={<Plus className="w-4 h-4" />} className="w-full">
            Add Scene
          </Button>
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Preview</h2>
          <Card className="text-center">
            <div className="flex justify-center mb-4">
              <Narrator mood={currentScene?.narratorMood || 'neutral'} isTalking={false} size="lg" />
            </div>
            <p className="text-sm text-slate-300 italic leading-relaxed">
              {currentScene?.narratorText || 'Narrator text will appear here...'}
            </p>
            {currentScene?.title && (
              <p className="text-xs text-slate-500 mt-3">Scene: {currentScene.title}</p>
            )}
            {currentScene?.question && (
              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg text-left">
                <p className="text-xs text-amber-400 font-medium mb-1">Question:</p>
                <p className="text-sm text-slate-200">{currentScene.question.text || '...'}</p>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Story Summary</h3>
            <div className="space-y-1.5 text-xs text-slate-400">
              <p>{scenes.length} scene{scenes.length !== 1 ? 's' : ''}</p>
              <p>{scenes.filter(s => s.question).length} question{scenes.filter(s => s.question).length !== 1 ? 's' : ''}</p>
              <p>~{Math.max(5, scenes.length * 2 + scenes.filter(s => s.question).length)} min estimated</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
