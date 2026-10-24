import { Users, X } from 'lucide-react';

interface Player {
  id: string;
  displayName: string;
  isConnected: boolean;
  avatar?: string;
}

interface PlayerListProps {
  players: Player[];
  onRemove?: (playerId: string) => void;
  showRemove?: boolean;
}

export function PlayerList({ players, onRemove, showRemove = false }: PlayerListProps) {
  if (players.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Waiting for players to join...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-400 font-medium">{players.length} player{players.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {players.map((player) => (
          <div
            key={player.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium slide-up ${
              player.isConnected
                ? 'bg-violet-500/15 text-violet-200 border border-violet-500/30'
                : 'bg-slate-700/30 text-slate-400 border border-slate-600/30'
            }`}
          >
            <span className={`text-xl leading-none shrink-0 ${player.isConnected ? '' : 'grayscale opacity-50'}`}>
              {player.avatar ?? '🙂'}
            </span>
            <span className="truncate flex-1">{player.displayName}</span>
            <span className={`w-2 h-2 rounded-full shrink-0 ${player.isConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            {showRemove && onRemove && (
              <button
                onClick={() => onRemove(player.id)}
                className="p-0.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
                title="Remove player"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
