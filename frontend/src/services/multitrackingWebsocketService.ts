const WS_BASE_URL = 'ws://localhost:8000';


export interface MultiCameraFrameData {
  frame_id: number;
  timestamp: number;
  total_cameras: number;
  cameras: {
    [cameraId: string]: {
      camera_id: number;
      bboxes: BBox[];
    };
  };
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

/**
 * Service chuyên dụng cho Multi-Camera Tracking WebSocket
 * Endpoint: ws://localhost:8000/ws/tracks/all
 */
export const multiCameraTrackingWebSocketService = {
  /**
   * Kết nối đến WebSocket multi-camera
   */
  connect(
    onMessage: (data: MultiCameraFrameData) => void,
    onError?: (error: string) => void,
    onClose?: () => void
  ): WebSocket {
    const ws = new WebSocket(`${WS_BASE_URL}/ws/tracks/all`);
    let isConnected = false;

    ws.onopen = () => {
      console.log('Connected to multi-camera tracking WebSocket (/ws/tracks/all)');
      isConnected = true;
    };

    ws.onmessage = (event) => {
      try {
        const data: MultiCameraFrameData = JSON.parse(event.data);
        console.log(
          `Received multi-camera frame ${data.frame_id} | ${data.total_cameras} cameras | ${Object.values(data.cameras).reduce(
            (sum, cam) => sum + cam.bboxes.length,
            0
          )} objects total`
        );
        onMessage(data);
      } catch (err) {
        console.error('Failed to parse multi-camera message:', err);
        onError?.('Invalid message format from server');
      }
    };

    ws.onerror = (event) => {
      console.error('Multi-camera WebSocket error:', event);
      onError?.('WebSocket connection failed');
    };

    ws.onclose = () => {
      console.log('Disconnected from multi-camera tracking WebSocket');
      isConnected = false;
      onClose?.();
    };

    // Gắn thuộc tính để kiểm tra trạng thái bên ngoài
    (ws as any).isReady = () => isConnected;

    return ws;
  },

  /**
   * Yêu cầu một frame cụ thể từ tất cả camera
   */
  requestFrame(ws: WebSocket, frameId: number): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn(`Cannot request frame ${frameId}: WebSocket not open (state: ${ws?.readyState})`);
      return;
    }

    const payload = JSON.stringify({ frame_id: frameId });
    ws.send(payload);
    console.log(`Requested multi-camera frame: ${frameId}`);
  },

  /**
   * Yêu cầu nhiều frame liên tiếp (ví dụ playback)
   */
  requestFrames(ws: WebSocket, frameIds: number[]): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('Cannot request frames: WebSocket not open');
      return;
    }

    frameIds.forEach((frameId) => {
      this.requestFrame(ws, frameId);
    });
  },

  /**
   * Gửi ping để giữ kết nối
   */
  ping(ws: WebSocket): void {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  },

  /**
   * Ngắt kết nối an toàn
   */
  disconnect(ws: WebSocket | null): void {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close(1000, 'Client disconnect');
    }
  },

  /**
   * Utility: Lấy bboxes của một camera cụ thể từ dữ liệu multi
   */
  getCameraBBoxes(data: MultiCameraFrameData, cameraId: number): BBox[] {
    return data.cameras[cameraId.toString()]?.bboxes ?? [];
  },

  /**
   * Utility: Lấy danh sách camera có dữ liệu trong frame này
   */
  getActiveCameraIds(data: MultiCameraFrameData): number[] {
    return Object.values(data.cameras).map((cam) => cam.camera_id);
  },
};