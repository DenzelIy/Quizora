import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  ArrowLeft, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { api, type PackFull, type PackScene, type PackQuestion } from '../services/api';
import { Narrator, type NarratorMood } from '../components/Narrator';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { MathText } from '../components/MathText';
import { useSettings } from '../contexts/SettingsContext';

type PlayerState = 'narrating' | 'question' | 'result' | 'complete';

interface QuestionResult {
  questionId: string;
  correct: boolean;
  selectedAnswerId: string;
}

export function GriotPlayer() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [pack, setPack] = useState<PackFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [sceneIndex, setSceneIndex] = useState(0);
  const [playerState, setPlayerState] = useState<PlayerState>('narrating');
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [useTTS, setUseTTS] = useState(false);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const typingRef = useRef<number | null>(null);
  const ttsRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!slug) return;
    api.getPack(slug)
      .then(p => {
        if (p.scenes.length === 0) {
          setError('This pack has no Griot Mode scenes.');
          return;
        }
        setPack(p);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const currentScene = pack?.scenes[sceneIndex] ?? null;
  const linkedQuestion = currentScene?.questionId
    ? pack?.questions.find(q => q.id === currentScene.questionId) ?? null
    : null;

  const typeText = useCallback((text: string) => {
    if (settings.reduceMotion) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }
    setDisplayedText('');
    setIsTyping(true);
    let i = 0;
    const speed = 30;

    const tick = () => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
        typingRef.current = window.setTimeout(tick, speed);
      } else {
        setIsTyping(false);
      }
    };
    tick();
  }, [settings.reduceMotion]);

  const stopTyping = useCallback(() => {
    if (typingRef.current) {
      clearTimeout(typingRef.current);
      typingRef.current = null;
    }
    setIsTyping(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!useTTS || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    ttsRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [useTTS]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    if (!currentScene || playerState !== 'narrating') return;
    typeText(currentScene.narratorText);
    speak(currentScene.narratorText);
    return () => { stopTyping(); stopSpeaking(); };
  }, [sceneIndex, playerState, currentScene, typeText, speak, stopTyping, stopSpeaking]);

  const skipToEnd = () => {
    if (isTyping && currentScene) {
      stopTyping();
      setDisplayedText(currentScene.narratorText);
      setIsTyping(false);
    }
  };

  const advanceScene = () => {
    if (!pack) return;

    if (playerState === 'narrating' && linkedQuestion) {
      setPlayerState('question');
      setSelectedAnswerId(null);
      setShowExplanation(false);
      return;
    }

    if (playerState === 'question' || playerState === 'result') {
      if (sceneIndex < pack.scenes.length - 1) {
        setSceneIndex(prev => prev + 1);
        setPlayerState('narrating');
      } else {
        setPlayerState('complete');
      }
      return;
    }

    if (sceneIndex < pack.scenes.length - 1) {
      setSceneIndex(prev => prev + 1);
      setPlayerState('narrating');
    } else {
      setPlayerState('complete');
    }
  };

  const goBack = () => {
    if (sceneIndex > 0) {
      setSceneIndex(prev => prev - 1);
      setPlayerState('narrating');
    }
  };

  const handleAnswer = (answerId: string) => {
    if (selectedAnswerId || !linkedQuestion) return;
    setSelectedAnswerId(answerId);
    const correct = linkedQuestion.answers.find(a => a.id === answerId)?.isCorrect ?? false;
    setResults(prev => [...prev, { questionId: linkedQuestion.id, correct, selectedAnswerId: answerId }]);
    setShowExplanation(true);
    setPlayerState('result');
  };

  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      if (isTyping && currentScene) {
        typeText(currentScene.narratorText.slice(displayedText.length));
      }
    } else {
      setIsPaused(true);
      stopTyping();
      stopSpeaking();
    }
  };

  useEffect(() => {
    if (playerState !== 'complete' || !pack) return;
    const correctCount = results.filter(r => r.correct).length;
    const totalQ = results.length;
    const totalPoints = totalQ * 10;
    const score = correctCount * 10;
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    api.recordCompletion({
      packId: pack.id,
      playerName: 'Student',
      mode: 'griot',
      score,
      totalPoints,
      correctAnswers: correctCount,
      totalQuestions: totalQ,
      timeTakenSeconds: timeTaken,
    }).catch(() => {});
  }, [playerState, pack, results]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f172a]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f172a] px-4">
        <Card className="max-w-md text-center py-8">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white mb-1">{error || 'Pack not found'}</h2>
          <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
        </Card>
      </div>
    );
  }

  if (playerState === 'complete') {
    const correctCount = results.filter(r => r.correct).length;
    const totalQ = results.length;
    const pct = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;

    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
        <Card className="max-w-lg w-full text-center py-8 space-y-6">
          <Narrator mood="happy" size="lg" className="mx-auto" />
          <h1 className="text-2xl font-bold text-white">Story Complete!</h1>
          <h2 className="text-lg text-amber-400">{pack.title}</h2>

          {totalQ > 0 && (
            <div className="space-y-3">
              <div className="text-4xl font-bold text-white">{pct}%</div>
              <p className="text-slate-400">
                You got {correctCount} out of {totalQ} question{totalQ !== 1 ? 's' : ''} correct
              </p>
              <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-amber-500 to-amber-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center pt-2">
            <Button variant="ghost" onClick={() => navigate(`/packs/${slug}`)}>Back to Pack</Button>
            <Button
              variant="primary"
              onClick={() => {
                setSceneIndex(0);
                setPlayerState('narrating');
                setResults([]);
              }}
            >
              Play Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const progress = ((sceneIndex + 1) / pack.scenes.length) * 100;

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1e293b]/80 backdrop-blur border-b border-slate-700/50">
        <button onClick={() => navigate(`/packs/${slug}`)} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Exit
        </button>
        <div className="flex-1 mx-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{pack.title}</span>
            <span>{sceneIndex + 1} / {pack.scenes.length}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-500 to-amber-400"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => setUseTTS(!useTTS)}
          className="text-slate-400 hover:text-white p-1"
          title={useTTS ? 'Disable voice' : 'Enable voice'}
        >
          {useTTS ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-2xl mx-auto w-full">
        {/* Scene title */}
        {currentScene && (
          <h2 className="text-lg font-semibold text-amber-400 mb-6 text-center">
            {currentScene.title}
          </h2>
        )}

        {/* Narrator character */}
        <div className="mb-8">
          <Narrator
            mood={(currentScene?.narratorMood as NarratorMood) ?? 'neutral'}
            isTalking={isTyping}
            size="lg"
          />
        </div>

        {/* Narration text / Question */}
        {(playerState === 'narrating') && (
          <div className="w-full space-y-6">
            <div
              className="bg-[#1e293b] rounded-2xl p-6 border border-slate-700/50 min-h-[120px] cursor-pointer"
              onClick={isTyping ? skipToEnd : advanceScene}
            >
              <p className="text-slate-200 leading-relaxed whitespace-pre-line">
                {displayedText}
                {isTyping && <span className="inline-block w-0.5 h-5 bg-amber-400 ml-0.5 animate-pulse align-text-bottom" />}
              </p>
            </div>

            {!isTyping && (
              <p className="text-center text-xs text-slate-500 animate-pulse">
                {linkedQuestion ? 'Tap to continue to question...' : 'Tap to continue...'}
              </p>
            )}
          </div>
        )}

        {(playerState === 'question' || playerState === 'result') && linkedQuestion && (
          <div className="w-full space-y-4">
            <Card className="border-amber-500/30">
              <p className="text-white font-medium text-center">
                {linkedQuestion.mathNotation ? <MathText text={linkedQuestion.text} /> : linkedQuestion.text}
              </p>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {linkedQuestion.answers.map((answer, i) => {
                const isSelected = selectedAnswerId === answer.id;
                const isRevealed = playerState === 'result';
                let borderColor = 'border-slate-600 hover:border-slate-500';
                let bgColor = 'bg-[#1e293b]';

                if (isRevealed) {
                  if (answer.isCorrect) {
                    borderColor = 'border-emerald-500';
                    bgColor = 'bg-emerald-500/10';
                  } else if (isSelected && !answer.isCorrect) {
                    borderColor = 'border-red-500';
                    bgColor = 'bg-red-500/10';
                  } else {
                    borderColor = 'border-slate-700';
                    bgColor = 'bg-slate-800/50';
                  }
                } else if (isSelected) {
                  borderColor = 'border-violet-500';
                  bgColor = 'bg-violet-500/10';
                }

                return (
                  <button
                    key={answer.id}
                    onClick={() => handleAnswer(answer.id)}
                    disabled={playerState === 'result'}
                    className={`p-4 rounded-xl border-2 ${borderColor} ${bgColor} text-left transition-all ${
                      playerState !== 'result' ? 'cursor-pointer active:scale-95' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-sm font-bold text-slate-300 flex-shrink-0">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-sm text-slate-200 flex-1">
                        {linkedQuestion.mathNotation ? <MathText text={answer.text} /> : answer.text}
                      </span>
                      {isRevealed && answer.isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                      {isRevealed && isSelected && !answer.isCorrect && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {showExplanation && linkedQuestion.explanation && (
              <Card className="border-slate-600/50 bg-slate-800/50">
                <p className="text-sm text-slate-300 italic">
                  {linkedQuestion.mathNotation ? <MathText text={linkedQuestion.explanation} /> : linkedQuestion.explanation}
                </p>
              </Card>
            )}

            {playerState === 'result' && (
              <div className="text-center">
                <Button variant="primary" onClick={advanceScene}>
                  {sceneIndex < pack.scenes.length - 1 ? 'Continue Story' : 'See Results'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-4 px-4 py-4 bg-[#1e293b]/50 border-t border-slate-700/30">
        <button
          onClick={goBack}
          disabled={sceneIndex === 0}
          className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <SkipBack className="w-5 h-5" />
        </button>
        <button
          onClick={togglePause}
          className="p-3 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-900 transition-colors"
        >
          {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
        </button>
        <button
          onClick={advanceScene}
          disabled={isTyping}
          className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
