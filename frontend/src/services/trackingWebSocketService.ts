const WS_BASE_URL = 'ws://localhost:8000';

export interface FrameTrackData {
  frame_id: number;
  camera_id: number;
  timestamp: number;
  bboxes: BBox[];
}

export type BBox = {
  object_id: number;
  class_id: number;
  corners_2d: [number, number][];
  yaw_arrow?: {
    start_2d: [number, number];
    end_2d: [number, number];
  };
  center_3d: [number, number, number];
  dimension: [number, number, number];
  yaw: number;
};

export const trackingWebSocketService = {
  /**
   * Connect to tracking WebSocket for a specific camera
   * @param cameraId - Camera ID
   * @param onMessage - Callback when track data is received
   * @param onError - Callback on error
   */
  connectToTracks(
    cameraId: number,
    onMessage: (data: FrameTrackData) => void,
    onError: (error: string) => void
  ): WebSocket {
    const ws = new WebSocket(`${WS_BASE_URL}/ws/tracks/${cameraId}`);
    let isConnected = false;

    ws.onopen = () => {
      console.log(`Connected to tracks WebSocket for camera ${cameraId}`);
      isConnected = true;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error('Error parsing track data:', e);
      }
    };

    ws.onerror = (event) => {
      console.error(`WebSocket error for camera ${cameraId}:`, event);
      onError(`Connection error for camera ${cameraId}`);
    };

    ws.onclose = () => {
      console.log(`Disconnected from tracks WebSocket for camera ${cameraId}`);
      isConnected = false;
    };

    (ws as any).isReadyForData = () => isConnected;

    return ws;
  },

  requestFrame(ws: WebSocket, frameId: number): void {
    if (ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ frame_id: frameId });
      console.log(`[DEBUG] Sending frame request: ${message}, ws.readyState: ${ws.readyState}`);
      ws.send(message);
    } else {
      console.warn(`[DEBUG] Cannot send frame request - WebSocket not ready. State: ${ws.readyState}`);
    }
  },

  /**
   * Send ping to keep connection alive
   */
  ping(ws: WebSocket): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  },

  /**
   * Disconnect from WebSocket
   */
  disconnect(ws: WebSocket): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  },
};

export const streamWebSocketService = {
  /**
   * Connect to video stream WebSocket for a specific camera
   * @param cameraId - Camera ID
   * @param onFrame - Callback when frame is received (Blob)
   * @param onError - Callback on error
   */
  connectToStream(
    cameraId: number,
    onFrame: (frame: Blob) => void,
    onError: (error: string) => void
  ): WebSocket {
    const ws = new WebSocket(`${WS_BASE_URL}/ws/stream/${cameraId}`);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      console.log(`Connected to stream WebSocket for camera ${cameraId}`);
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        const blob = new Blob([event.data], { type: 'image/jpeg' });
        onFrame(blob);
      } else {
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            onError(data.error);
          }
        } catch (e) {
          console.error('Error parsing stream message:', e);
        }
      }
    };

    ws.onerror = (event) => {
      console.error(`Stream WebSocket error for camera ${cameraId}:`, event);
      onError(`Stream connection error for camera ${cameraId}`);
    };

    ws.onclose = () => {
      console.log(`Disconnected from stream WebSocket for camera ${cameraId}`);
    };

    return ws;
  },

  disconnect(ws: WebSocket): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  },
};
