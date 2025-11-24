// contexts/PlaybackSyncContext.tsx
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { multiCameraTrackingWebSocketService, type MultiCameraFrameData } from '../services/multitrackingWebsocketService';

interface PlaybackSyncContextType {
  currentFrame: number;
  isPlaying: boolean;
  totalFrames: number;
  multiFrameData: MultiCameraFrameData | null;
  wsConnected: boolean; // NEW: Track connection state
  wsError: string | null; // NEW: Track errors
  seekToFrame: (frame: number) => void;
  play: () => void;
  pause: () => void;
  setTotalFrames: (frames: number) => void;
  reconnect: () => void; // NEW: Manual reconnect
}

const PlaybackSyncContext = createContext<PlaybackSyncContextType | undefined>(undefined);

export const PlaybackSyncProvider = ({ children }: { children: ReactNode }) => {
  const [currentFrame, setCurrentFrame] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [totalFrames, setTotalFrames] = useState(3000);
  const [multiFrameData, setMultiFrameData] = useState<MultiCameraFrameData | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const connectWebSocket = () => {
    // Clear existing connection
    if (wsRef.current) {
      multiCameraTrackingWebSocketService.disconnect(wsRef.current);
      wsRef.current = null;
    }

    console.log('[PlaybackSync] Attempting WebSocket connection...');
    
    try {
      const ws = multiCameraTrackingWebSocketService.connect(
        (data) => {
          console.log(`[PlaybackSync] ✅ Received frame ${data.frame_id}`);
          setMultiFrameData(data);
          setCurrentFrame(data.frame_id);
          setWsConnected(true);
          setWsError(null);
          reconnectAttemptsRef.current = 0; // Reset on success
        },
        (error) => {
          console.error('[PlaybackSync] ❌ WebSocket error:', error);
          setWsError(error);
          setWsConnected(false);
          scheduleReconnect();
        },
        () => {
          console.log('[PlaybackSync] 🔌 WebSocket closed');
          setWsConnected(false);
          scheduleReconnect();
        }
      );

      wsRef.current = ws;

      // Monitor connection state
      const checkConnection = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          setWsConnected(true);
          setWsError(null);
          clearInterval(checkConnection);
        } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
          setWsConnected(false);
          clearInterval(checkConnection);
        }
      }, 100);

      setTimeout(() => clearInterval(checkConnection), 5000); 

    } catch (err) {
      console.error('[PlaybackSync] ❌ Failed to create WebSocket:', err);
      setWsError(err instanceof Error ? err.message : 'Connection failed');
      setWsConnected(false);
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('[PlaybackSync] ⚠️ Max reconnection attempts reached');
      setWsError('Failed to connect after multiple attempts. Please check if the server is running.');
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000); // Exponential backoff
    reconnectAttemptsRef.current++;

    console.log(`[PlaybackSync] 🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

    reconnectTimeoutRef.current = window.setTimeout(() => {
      connectWebSocket();
    }, delay);
  };

  const reconnect = () => {
    console.log('[PlaybackSync] 🔄 Manual reconnect requested');
    reconnectAttemptsRef.current = 0; // Reset counter
    connectWebSocket();
  };

  useEffect(() => {
    // Initial connection with delay to ensure server is ready
    const initialConnectionTimeout = setTimeout(() => {
      connectWebSocket();
    }, 500); // Give server 500ms to be ready

    return () => {
      clearTimeout(initialConnectionTimeout);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        multiCameraTrackingWebSocketService.disconnect(wsRef.current);
      }
    };
  }, []);

  const seekToFrame = (frame: number) => {
    const clamped = Math.max(1, Math.min(frame, totalFrames));
    setCurrentFrame(clamped);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      multiCameraTrackingWebSocketService.requestFrame(wsRef.current, clamped);
    } else {
      console.warn(`[PlaybackSync] Cannot seek to frame ${clamped}: WebSocket not connected`);
    }
  };

  const play = () => {
    if (!wsConnected) {
      console.warn('[PlaybackSync] Cannot play: WebSocket not connected');
      return;
    }
    setIsPlaying(true);
  };

  const pause = () => setIsPlaying(false);

  return (
    <PlaybackSyncContext.Provider value={{
      currentFrame,
      isPlaying,
      totalFrames,
      multiFrameData,
      wsConnected,
      wsError,
      seekToFrame,
      play,
      pause,
      setTotalFrames,
      reconnect,
    }}>
      {children}
    </PlaybackSyncContext.Provider>
  );
};

export const usePlaybackSync = () => {
  const context = useContext(PlaybackSyncContext);
  if (!context) throw new Error('usePlaybackSync must be used within PlaybackSyncProvider');
  return context;
};