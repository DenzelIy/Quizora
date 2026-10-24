import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, LogIn } from 'lucide-react';
import { Button } from '../components/Button';
import { socket, connectSocket } from '../services/socket';
import { AVATARS, randomAvatar } from '../components/avatars';

export function JoinGame() {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [avatar, setAvatar] = useState(randomAvatar);
  const pinRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    pinRef.current?.focus();
  }, []);

  const handlePinChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setPin(digits);
    setError('');
  };

  const handleJoin = async () => {
    if (pin.length !== 6) {
      setError('Enter a 6-digit game PIN');
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Enter your display name');
      return;
    }
    if (trimmedName.length > 20) {
      setError('Name must be 20 characters or less');
      return;
    }

    setJoining(true);
    setError('');

    try {
      await connectSocket();
      socket.emit(
        'player:join-session',
        { pin, displayName: trimmedName, avatar },
        (response: { success?: boolean; sessionId?: string; playerId?: string; displayName?: string; error?: string }) => {
          setJoining(false);
          if (response.success && response.sessionId) {
            navigate(`/play/${response.sessionId}`, {
              state: { playerId: response.playerId, playerName: response.displayName ?? trimmedName, avatar },
            });
          } else {
            setError(response.error || 'Could not join game');
          }
        }
      );
    } catch {
      setJoining(false);
      setError('Could not connect to game server');
    }
  };

  return (
    <div className="gradient-bg min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-sm w-full space-y-8 fade-in">
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl bg-violet-500 flex items-center justify-center mx-auto mb-3">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Join Game</h1>
          <p className="text-sm text-slate-400 mt-1">Enter the PIN shown on the host screen</p>
        </div>

        <div className="space-y-4">
          <div>
            <input
              ref={pinRef}
              type="text"
              inputMode="numeric"
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              placeholder="000000"
              maxLength={6}
              className="w-full text-center text-4xl font-bold tracking-[0.3em] py-4 bg-[#1e293b] border-2 border-slate-600 rounded-xl text-white placeholder-slate-600 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            <p className="text-xs text-slate-500 text-center mt-1">Game PIN</p>
          </div>

          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Your name"
              maxLength={20}
              className="w-full text-center text-lg py-3 bg-[#1e293b] border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>

          <div>
            <p className="text-xs text-slate-400 text-center mb-2">Pick your character</p>
            <div className="grid grid-cols-8 gap-1.5">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={`aspect-square rounded-lg text-2xl flex items-center justify-center transition-all ${
                    a === avatar
                      ? 'bg-violet-500 ring-2 ring-violet-300 scale-110'
                      : 'bg-[#1e293b] hover:bg-slate-700'
                  }`}
                  aria-label={`Character ${a}`}
                  aria-pressed={a === avatar}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <Button
            size="lg"
            className="w-full"
            icon={<LogIn className="w-5 h-5" />}
            loading={joining}
            onClick={handleJoin}
            disabled={pin.length !== 6 || !name.trim()}
          >
            Join
          </Button>
        </div>
      </div>
    </div>
  );
}
