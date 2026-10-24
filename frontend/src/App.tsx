import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { HostDashboard } from './pages/HostDashboard';
import { QuizEditor } from './pages/QuizEditor';
import { HostLobby } from './pages/HostLobby';
import { HostGame } from './pages/HostGame';
import { GameResults } from './pages/GameResults';
import { GameHistory } from './pages/GameHistory';
import { PackBrowser } from './pages/PackBrowser';
import { PackDetail } from './pages/PackDetail';
import { GriotPlayer } from './pages/GriotPlayer';
import { JoinGame } from './pages/JoinGame';
import { PlayerGame } from './pages/PlayerGame';
import { Welcome } from './pages/Welcome';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<HostDashboard />} />
        <Route path="/host/quiz/new" element={<QuizEditor />} />
        <Route path="/host/quiz/:id" element={<QuizEditor />} />
        <Route path="/host/lobby/:sessionId" element={<HostLobby />} />
        <Route path="/host/game/:sessionId" element={<HostGame />} />
        <Route path="/host/results/:sessionId" element={<GameResults />} />
        <Route path="/host/history" element={<GameHistory />} />
        <Route path="/packs" element={<PackBrowser />} />
        <Route path="/packs/:slug" element={<PackDetail />} />
      </Route>
      <Route path="/griot/:slug" element={<GriotPlayer />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/join" element={<JoinGame />} />
      <Route path="/play/:sessionId" element={<PlayerGame />} />
    </Routes>
  );
}
