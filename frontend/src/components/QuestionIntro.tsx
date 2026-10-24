import type React from 'react';

interface QuestionIntroProps {
  questionIndex: number;
  totalQuestions: number;
  text: string;
  /** Full intro length, so the bar's width matches how much of the intro is left. */
  introMs: number;
  /** Time left in the intro when this screen appeared (less than introMs after a reconnect). */
  remainingMs: number;
  size?: 'md' | 'lg';
}

/** Kahoot-style "read the question" screen shown before the answers appear. */
export function QuestionIntro({ questionIndex, totalQuestions, text, introMs, remainingMs, size = 'lg' }: QuestionIntroProps) {
  const startWidth = introMs > 0 ? Math.min(100, (remainingMs / introMs) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4 text-center fade-in">
      <span className="px-4 py-1.5 rounded-full bg-violet-500/20 text-violet-300 text-sm font-semibold tracking-wide">
        Question {questionIndex + 1} of {totalQuestions}
      </span>
      <h2
        className={`font-bold text-white leading-tight max-w-3xl ${
          size === 'lg' ? 'text-3xl sm:text-5xl' : 'text-2xl sm:text-3xl'
        }`}
      >
        {text}
      </h2>
      <div className="w-full max-w-md h-2 rounded-full bg-slate-700/50 overflow-hidden">
        <div
          key={`${questionIndex}-${remainingMs}`}
          className="h-full bg-violet-500 rounded-full"
          style={{
            '--shrink-from': `${startWidth}%`,
            animation: `shrinkWidth ${remainingMs}ms linear forwards`,
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
}
