import { Link } from 'react-router-dom';
import { Zap, Monitor, LogIn, PlusCircle, List, History, Wifi } from 'lucide-react';
import { Button } from '../components/Button';

export function Home() {
  return (
    <div className="gradient-bg min-h-[calc(100vh-57px)] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full text-center space-y-8 fade-in">
        <div className="space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-violet-500 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/30">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white">
            Quiz<span className="text-violet-400">Spark</span>
          </h1>
          <p className="text-lg text-slate-300">
            Offline Multiplayer Quiz Game
          </p>
        </div>

        <div className="space-y-3">
          <Link to="/host" className="block">
            <Button variant="primary" size="lg" icon={<Monitor className="w-5 h-5" />} className="w-full">
              Host a Game
            </Button>
          </Link>
          <Link to="/join" className="block">
            <Button variant="secondary" size="lg" icon={<LogIn className="w-5 h-5" />} className="w-full">
              Join a Game
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/host/quiz/new" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-violet-300 transition-colors">
            <PlusCircle className="w-4 h-4" /> Create a Quiz
          </Link>
          <Link to="/host" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-violet-300 transition-colors">
            <List className="w-4 h-4" /> My Quizzes
          </Link>
          <Link to="/host/history" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-violet-300 transition-colors">
            <History className="w-4 h-4" /> Game History
          </Link>
        </div>

        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/40">
          <div className="flex items-center gap-2 justify-center text-cyan-400 mb-2">
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">Works Offline</span>
          </div>
          <p className="text-sm text-slate-400">
            Play quizzes on your local network — no internet required!
            Connect devices to the same Wi-Fi or hotspot to get started.
          </p>
        </div>
      </div>
    </div>
  );
}
