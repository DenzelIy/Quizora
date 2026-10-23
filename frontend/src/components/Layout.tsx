import { Outlet, Link, useLocation } from 'react-router-dom';
import { Zap, Monitor, LogIn } from 'lucide-react';

export function Layout() {
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#1e293b] border-b border-slate-700/50 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-white">Quiz<span className="text-violet-400">Spark</span></span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              to="/host"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/host')
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">Host</span>
            </Link>
            <Link
              to="/join"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/join')
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Join</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
