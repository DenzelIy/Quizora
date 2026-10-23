import { useState, useEffect, useCallback } from 'react';
import { socket } from '../services/socket';

export type GamePhase = 'waiting' | 'question' | 'submitted' | 'reveal' | 'leaderboard' | 'finished';

interface GameStateHook {
  phase: GamePhase;
  setPhase: (phase: GamePhase) => void;
}

export function useGamePhase(): GameStateHook {
  const [phase, setPhase] = useState<GamePhase>('waiting');

  useEffect(() => {
    const onQuestionStarted = () => setPhase('question');
    const onAnswerReveal = () => setPhase('reveal');
    const onLeaderboard = () => setPhase('leaderboard');
    const onFinished = () => setPhase('finished');

    socket.on('game:question-started', onQuestionStarted);
    socket.on('game:answer-reveal', onAnswerReveal);
    socket.on('game:leaderboard', onLeaderboard);
    socket.on('game:finished', onFinished);

    return () => {
      socket.off('game:question-started', onQuestionStarted);
      socket.off('game:answer-reveal', onAnswerReveal);
      socket.off('game:leaderboard', onLeaderboard);
      socket.off('game:finished', onFinished);
    };
  }, []);

  return { phase, setPhase };
}
