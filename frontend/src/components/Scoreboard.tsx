import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';

interface ScoreboardEntry {
  playerId: string;
  displayName: string;
  avatar?: string;
  score: number;
  rank: number;
  previousRank?: number;
  previousScore?: number;
}

interface ScoreboardProps {
  entries: ScoreboardEntry[];
  /** How many top players to show. */
  limit?: number;
  /** Delay before rows move to their new positions (lines up with the drumroll). */
  reorderDelayMs?: number;
}

const ROW_PITCH = 72;
const ROW_HEIGHT = 62;

/** Counts from `from` to `to` once `active` turns true. */
function useCountUp(from: number, to: number, active: boolean, durationMs = 900) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (!active) {
      setValue(from);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [from, to, active, durationMs]);
  return value;
}

function Row({ entry, position, reordered }: { entry: ScoreboardEntry; position: number; reordered: boolean }) {
  const score = useCountUp(entry.previousScore ?? 0, entry.score, reordered);
  const climbed = reordered && entry.previousRank !== undefined && entry.previousRank > entry.rank;
  const isTop = position === 0;

  return (
    <div
      className={`absolute left-0 right-0 flex items-center gap-4 px-5 rounded-xl font-semibold transition-all duration-700 ease-out ${
        isTop ? 'bg-violet-500 text-white text-xl sm:text-2xl shadow-lg shadow-violet-500/30' : 'bg-slate-700/70 text-white text-lg sm:text-xl'
      }`}
      style={{ top: position * ROW_PITCH, height: ROW_HEIGHT }}
    >
      <span className="w-7 text-center opacity-80 tabular-nums">{reordered ? entry.rank : entry.previousRank ?? ''}</span>
      <span className="text-3xl leading-none">{entry.avatar ?? '🙂'}</span>
      <span className="flex-1 truncate">{entry.displayName}</span>
      {climbed && (
        <span className="flex items-center gap-1 text-sm text-emerald-300 fade-in">
          <TrendingUp className="w-4 h-4" /> {entry.previousRank! - entry.rank}
        </span>
      )}
      <span className="tabular-nums">{score.toLocaleString()}</span>
    </div>
  );
}

/**
 * Between-questions scoreboard for the host screen. It opens in the previous order with the
 * previous scores, then rows slide into their new positions and scores count up, so overtakes show.
 */
export function Scoreboard({ entries, limit = 5, reorderDelayMs = 900 }: ScoreboardProps) {
  const [reordered, setReordered] = useState(false);

  useEffect(() => {
    setReordered(false);
    const id = setTimeout(() => setReordered(true), reorderDelayMs);
    return () => clearTimeout(id);
  }, [entries, reorderDelayMs]);

  // Before: last scoreboard's order (newcomers after everyone else). After: the new ranking.
  const before = [...entries].sort(
    (a, b) => (a.previousRank ?? Infinity) - (b.previousRank ?? Infinity) || a.rank - b.rank,
  );
  const positionBefore = new Map(before.map((e, i) => [e.playerId, i]));
  const positionAfter = new Map(entries.map((e, i) => [e.playerId, i]));

  // Render anyone who is or was in the top rows, so climbers slide in from below and fallers slide out.
  const visible = entries.filter(
    (e) => positionAfter.get(e.playerId)! < limit || positionBefore.get(e.playerId)! < limit,
  );

  return (
    <div
      className="relative w-full max-w-2xl mx-auto overflow-hidden"
      style={{ height: Math.max(1, Math.min(limit, entries.length)) * ROW_PITCH - (ROW_PITCH - ROW_HEIGHT) }}
    >
      {visible.map((entry) => (
        <Row
          key={entry.playerId}
          entry={entry}
          position={(reordered ? positionAfter : positionBefore).get(entry.playerId)!}
          reordered={reordered}
        />
      ))}
    </div>
  );
}
