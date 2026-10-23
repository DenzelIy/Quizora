import { useState, useEffect, useCallback } from 'react';
import { socket, connectSocket } from '../services/socket';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const connect = useCallback(async () => {
    await connectSocket();
  }, []);

  const emit = useCallback(<T,>(event: string, data?: unknown): Promise<T> => {
    return new Promise((resolve) => {
      socket.emit(event, data, (response: T) => resolve(response));
    });
  }, []);

  return { socket, isConnected, connect, emit };
}
