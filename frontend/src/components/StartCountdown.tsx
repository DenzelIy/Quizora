import { useEffect } from 'react';
import { useCountdown } from '../hooks/useCountdown';
import { playCountdownBeep } from '../services/sound';

interface StartCountdownProps {
  /** Date.now() timestamp when the first question appears. */
  until: number;
  title?: string;
  /** Beep on each number (used on the host screen). */
  withSound?: boolean;
}

/** Full-screen 3-2-1 shown between pressing Start and the first question. */
export function StartCountdown({ until, title, withSound = false }: StartCountdownProps) {
  const remaining = useCountdown(until);

  useEffect(() => {
    if (withSound) playCountdownBeep(remaining);
  }, [remaining, withSound]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 fade-in">
      <p className="text-lg font-medium text-slate-400">{title ?? 'Get ready!'}</p>
      <div
        key={remaining}
        className="w-40 h-40 rounded-full bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/30 pulse-grow"
      >
        <span className="text-7xl font-bold text-white">{remaining > 0 ? remaining : 'Go!'}</span>
      </div>
    </div>
  );
}
