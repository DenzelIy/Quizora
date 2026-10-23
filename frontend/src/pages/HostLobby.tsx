import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Copy, CheckCheck, Settings, Wifi, Users } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PlayerList } from '../components/PlayerList';
import { socket, connectSocket } from '../services/socket';
import { api, type NetworkInfo } from '../services/api';

interface Player {
  id: string;
  displayName: string;
  isConnected: boolean;
}

interface GameSettings {
  speedScoring: boolean;
  showLeaderboard: 'after-each' | 'end-only' | 'never';
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  showExplanations: boolean;
  allowLateJoin: boolean;
  maxPlayers: number;
  minPlayers: number;
}

const defaultSettings: GameSettings = {
  speedScoring: true,
  showLeaderboard: 'after-each',
  randomizeQuestions: false,
  randomizeAnswers: false,
  showExplanations: true,
  allowLateJoin: false,
  maxPlayers: 100,
  minPlayers: 1,
};

export function HostLobby() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    api.getNetworkInfo().then(setNetworkInfo).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const ensureConnected = async () => {
      if (!socket.connected) await connectSocket();

      socket.emit('host:get-session', { sessionId }, (response: { success: boolean; pin?: string; quizTitle?: string; players?: Player[]; settings?: GameSettings }) => {
        if (response.success) {
          setPin(response.pin || '');
          setQuizTitle(response.quizTitle || '');
          setPlayers(response.players || []);
          if (response.settings) setSettings(response.settings);
        }
      });
    };

    ensureConnected();

    const onPlayersUpdated = (data: { players: Player[] }) => setPlayers(data.players);
    const onGameStarted = () => navigate(`/host/game/${sessionId}`);

    socket.on('session:players-updated', onPlayersUpdated);
    socket.on('game:started', onGameStarted);

    return () => {
      socket.off('session:players-updated', onPlayersUpdated);
      socket.off('game:started', onGameStarted);
    };
  }, [sessionId, navigate]);

  const joinUrl = networkInfo?.interfaces[0]
    ? `http://${networkInfo.interfaces[0].address}:${networkInfo.port}/join`
    : `${window.location.origin}/join`;

  const copyPin = useCallback(() => {
    navigator.clipboard.writeText(pin).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [pin]);

  const handleKick = useCallback((playerId: string) => {
    socket.emit('host:kick-player', { sessionId, playerId });
  }, [sessionId]);

  const handleStart = () => {
    setStarting(true);
    socket.emit('host:start-game', { sessionId, settings }, (response: { success: boolean; error?: string }) => {
      if (!response.success) {
        alert(response.error || 'Could not start game');
        setStarting(false);
      }
    });
  };

  const connectedCount = players.filter((p) => p.isConnected).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold text-slate-300">{quizTitle}</h1>
        <p className="text-sm text-slate-400">Share the PIN or QR code with players</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="text-center space-y-4">
          <p className="text-sm text-slate-400 font-medium">GAME PIN</p>
          <button
            onClick={copyPin}
            className="text-6xl sm:text-7xl font-bold text-white tracking-[0.15em] hover:text-violet-300 transition-colors cursor-pointer"
            title="Click to copy"
          >
            {pin}
          </button>
          <Button
            variant="ghost"
            size="sm"
            icon={copied ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            onClick={copyPin}
          >
            {copied ? 'Copied!' : 'Copy PIN'}
          </Button>
        </Card>

        <Card className="flex flex-col items-center justify-center space-y-3">
          <QRCodeSVG value={joinUrl} size={160} bgColor="transparent" fgColor="#e2e8f0" level="M" />
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Wifi className="w-3 h-3" />
            <span className="font-mono">{joinUrl}</span>
          </div>
        </Card>
      </div>

      <Card>
        <PlayerList players={players} showRemove onRemove={handleKick} />
      </Card>

      <Card>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 w-full text-sm font-medium text-slate-300 hover:text-white transition-colors"
        >
          <Settings className="w-4 h-4" />
          Game Settings
          <span className="text-xs text-slate-500 ml-auto">{showSettings ? 'Hide' : 'Show'}</span>
        </button>

        {showSettings && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={settings.speedScoring}
                onChange={(e) => setSettings({ ...settings, speedScoring: e.target.checked })}
                className="w-4 h-4 accent-violet-500"
              />
              Speed-based scoring
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={settings.randomizeQuestions}
                onChange={(e) => setSettings({ ...settings, randomizeQuestions: e.target.checked })}
                className="w-4 h-4 accent-violet-500"
              />
              Randomize question order
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={settings.randomizeAnswers}
                onChange={(e) => setSettings({ ...settings, randomizeAnswers: e.target.checked })}
                className="w-4 h-4 accent-violet-500"
              />
              Randomize answer order
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={settings.showExplanations}
                onChange={(e) => setSettings({ ...settings, showExplanations: e.target.checked })}
                className="w-4 h-4 accent-violet-500"
              />
              Show explanations
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={settings.allowLateJoin}
                onChange={(e) => setSettings({ ...settings, allowLateJoin: e.target.checked })}
                className="w-4 h-4 accent-violet-500"
              />
              Allow late joining
            </label>
            <div className="text-sm text-slate-300">
              <label className="block mb-1">Leaderboard</label>
              <select
                value={settings.showLeaderboard}
                onChange={(e) => setSettings({ ...settings, showLeaderboard: e.target.value as GameSettings['showLeaderboard'] })}
                className="w-full px-3 py-2 bg-[#334155] border border-slate-600 rounded-lg text-slate-100 outline-none text-sm"
              >
                <option value="after-each">After each question</option>
                <option value="end-only">End only</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-center">
        <Button
          size="lg"
          icon={<Play className="w-5 h-5" />}
          loading={starting}
          onClick={handleStart}
          disabled={connectedCount < settings.minPlayers}
          className="px-12"
        >
          Start Game ({connectedCount} <Users className="w-4 h-4 inline" />)
        </Button>
      </div>

      {connectedCount < settings.minPlayers && (
        <p className="text-sm text-yellow-400 text-center">
          Need at least {settings.minPlayers} player{settings.minPlayers > 1 ? 's' : ''} to start
        </p>
      )}
    </div>
  );
}
