import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isMuted, setMuted } from '../services/sound';

export function MuteButton({ className = '' }: { className?: string }) {
  const [muted, setMutedState] = useState(isMuted());

  return (
    <button
      type="button"
      onClick={() => {
        setMuted(!muted);
        setMutedState(!muted);
      }}
      className={`p-2 rounded-lg bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors ${className}`}
      title={muted ? 'Unmute sound' : 'Mute sound'}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
    >
      {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
    </button>
  );
}
