import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SettingsProvider } from './contexts/SettingsContext';
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
import { StoryEditor } from './pages/StoryEditor';
import { ExamMode } from './pages/ExamMode';
import { JoinGame } from './pages/JoinGame';
import { PlayerGame } from './pages/PlayerGame';
import { Welcome } from './pages/Welcome';
import { Settings } from './pages/Settings';

export function App() {
  return (
    <SettingsProvider>
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
          <Route path="/settings" element={<Settings />} />
          <Route path="/story/new" element={<StoryEditor />} />
          <Route path="/story/edit/:id" element={<StoryEditor />} />
        </Route>
        <Route path="/griot/:slug" element={<GriotPlayer />} />
        <Route path="/exam/:slug" element={<ExamMode />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/join" element={<JoinGame />} />
        <Route path="/play/:sessionId" element={<PlayerGame />} />
      </Routes>
    </SettingsProvider>
  );
}
