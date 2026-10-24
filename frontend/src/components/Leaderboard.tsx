import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  avatar?: string;
  score: number;
  correctAnswers: number;
  rank: number;
  previousRank?: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  highlightPlayerId?: string | null;
  showPodium?: boolean;
}

const podiumColors = ['#fbbf24', '#9ca3af', '#d97706'];
const podiumLabels = ['1st', '2nd', '3rd'];
const podiumHeights = ['h-28', 'h-20', 'h-16'];
const podiumOrder = [1, 0, 2];

function RankChange({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined || previous === current) {
    return <Minus className="w-3 h-3 text-slate-500" />;
  }
  if (current < previous) {
    return (
      <span className="flex items-center text-emerald-400 text-xs">
        <TrendingUp className="w-3 h-3" />
        <span className="ml-0.5">{previous - current}</span>
      </span>
    );
  }
  return (
    <span className="flex items-center text-red-400 text-xs">
      <TrendingDown className="w-3 h-3" />
      <span className="ml-0.5">{current - previous}</span>
    </span>
  );
}

export function Leaderboard({ entries, highlightPlayerId, showPodium = true }: LeaderboardProps) {
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(showPodium ? 3 : 0);

  return (
    <div className="w-full max-w-lg mx-auto">
      {showPodium && top3.length >= 2 && (
        <div className="flex items-end justify-center gap-2 mb-6 px-4">
          {podiumOrder.map((podiumIdx) => {
            const entry = top3[podiumIdx];
            if (!entry) return <div key={podiumIdx} className="flex-1" />;
            return (
              <div key={entry.playerId} className="flex-1 flex flex-col items-center podium-rise">
                <span className="text-5xl leading-none mb-1">{entry.avatar ?? '🙂'}</span>
                <Trophy className="w-5 h-5 mb-1" style={{ color: podiumColors[podiumIdx] }} />
                <p className="text-sm font-semibold text-white truncate max-w-full text-center">
                  {entry.displayName}
                </p>
                <p className="text-xs text-slate-400 mb-2">{entry.score.toLocaleString()} pts</p>
                <div
                  className={`w-full ${podiumHeights[podiumIdx]} rounded-t-lg flex items-center justify-center`}
                  style={{ backgroundColor: podiumColors[podiumIdx] + '33', borderTop: `3px solid ${podiumColors[podiumIdx]}` }}
                >
                  <span className="text-lg font-bold" style={{ color: podiumColors[podiumIdx] }}>
                    {podiumLabels[podiumIdx]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-1">
        {(showPodium ? rest : entries).map((entry) => (
          <div
            key={entry.playerId}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
              entry.playerId === highlightPlayerId
                ? 'bg-violet-500/20 border border-violet-500/40'
                : 'bg-slate-800/50'
            }`}
          >
            <span className="w-8 text-center font-bold text-slate-400 text-sm">
              #{entry.rank}
            </span>
            <span className="text-xl leading-none">{entry.avatar ?? '🙂'}</span>
            <span className="flex-1 font-medium text-white truncate">
              {entry.displayName}
            </span>
            <RankChange current={entry.rank} previous={entry.previousRank} />
            <span className="text-sm text-slate-400">
              {entry.correctAnswers} correct
            </span>
            <span className="font-bold text-violet-300 min-w-[70px] text-right">
              {entry.score.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
