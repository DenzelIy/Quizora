import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, WifiOff, Wifi, Shield, Rocket, Copy, Check, Monitor, Smartphone, ArrowRight,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { api, type NetworkInfo } from '../services/api';

declare global {
  interface Window {
    quizora?: {
      isDesktopApp: boolean;
      getServerInfo?: () => Promise<{
        port: number;
        addresses: { name: string; address: string }[];
        joinUrl: string;
      }>;
    };
  }
}

export function Welcome() {
  const navigate = useNavigate();
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const isDesktop = !!window.quizora?.isDesktopApp;

  useEffect(() => {
    api.getNetworkInfo().then(setNetworkInfo).catch(() => {});
  }, []);

  const joinUrl =
    networkInfo && networkInfo.interfaces.length > 0
      ? `http://${networkInfo.interfaces[0].address}:${networkInfo.port}`
      : null;

  function copyUrl() {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const steps = [
    {
      icon: <WifiOff className="w-7 h-7" />,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      title: 'No Internet Required',
      description:
        'Quizora runs entirely on your local network. Once installed, everything works offline — no cloud, no accounts, no subscriptions.',
    },
    {
      icon: <Wifi className="w-7 h-7" />,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      title: 'Connect to the Same Network',
      description:
        'Make sure your computer and student devices are on the same Wi-Fi network or mobile hotspot. Students open a browser and enter the address shown below.',
      extra: joinUrl ? (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
            Your Network Address
          </p>
          <div className="flex items-center gap-2">
            <code className="bg-slate-800 px-3 py-2 rounded-lg text-emerald-300 font-mono text-sm flex-1 truncate">
              {joinUrl}
            </code>
            <button
              onClick={copyUrl}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300"
              title="Copy URL"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          {networkInfo && networkInfo.interfaces.length > 1 && (
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer hover:text-slate-400">
                All detected addresses
              </summary>
              <ul className="mt-1 space-y-0.5 pl-3">
                {networkInfo.interfaces.map((iface) => (
                  <li key={iface.name}>
                    <span className="text-slate-400">{iface.name}:</span>{' '}
                    <code className="text-slate-300">
                      http://{iface.address}:{networkInfo.port}
                    </code>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      ) : null,
    },
    {
      icon: <Shield className="w-7 h-7" />,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      title: 'Allow Network Access',
      description: isDesktop
        ? 'Windows may ask to allow Quizora through the firewall. Click "Allow access" so student devices can connect. Only private network access is needed.'
        : 'If students cannot connect, check that your firewall allows Node.js on port ' +
          (networkInfo?.port ?? 3001) +
          '. On Windows, allow the app through Windows Defender Firewall for private networks.',
    },
    {
      icon: <Rocket className="w-7 h-7" />,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      title: 'Start Your First Quiz',
      description:
        'Create a quiz or try one of the included samples. Start a game, share the PIN with your class, and go!',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl space-y-10">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 shadow-xl shadow-violet-500/25 mb-2">
              <Zap className="w-10 h-10 text-white" fill="currentColor" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
              Welcome to Quizora
            </h1>
            <p className="text-lg text-slate-400 max-w-md mx-auto">
              The offline multiplayer quiz game for classrooms and training
              sessions
            </p>
          </div>

          <div className="grid gap-2">
            <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold px-1">
              How It Works
            </h2>

            <div className="flex flex-col gap-3">
              {steps.map((step, i) => (
                <Card key={i} padding="md" className="relative overflow-hidden">
                  <div className="flex gap-4 items-start">
                    <div
                      className={`flex-shrink-0 w-12 h-12 rounded-xl ${step.bg} ${step.color} flex items-center justify-center`}
                    >
                      {step.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-500">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <h3 className="font-semibold text-white">
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {step.description}
                      </p>
                      {step.extra}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Card padding="md" className="bg-slate-800/50 border-dashed">
            <div className="flex items-center justify-center gap-4 sm:gap-8 py-2 text-slate-400">
              <div className="flex flex-col items-center gap-1.5">
                <Monitor className="w-8 h-8 text-violet-400" />
                <span className="text-xs font-medium">Your Computer</span>
                <span className="text-[10px] text-slate-500">(Host)</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1">
                  <div className="w-8 h-px bg-slate-600" />
                  <Wifi className="w-4 h-4 text-emerald-500" />
                  <div className="w-8 h-px bg-slate-600" />
                </div>
                <span className="text-[10px] text-slate-500">Same Wi-Fi</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Smartphone className="w-8 h-8 text-cyan-400" />
                <span className="text-xs font-medium">Student Devices</span>
                <span className="text-[10px] text-slate-500">(Browsers)</span>
              </div>
            </div>
          </Card>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => navigate('/host')}
              icon={<ArrowRight className="w-5 h-5" />}
              className="w-full sm:w-auto"
            >
              Get Started
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => navigate('/')}
              className="w-full sm:w-auto"
            >
              Go to Home
            </Button>
          </div>
        </div>
      </div>

      <div className="text-center py-4 text-xs text-slate-600">
        Quizora works without internet &middot; Your data stays on this
        computer
      </div>
    </div>
  );
}
