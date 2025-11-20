import { useEffect, useRef, useState } from 'react';
import { trackingWebSocketService, type FrameTrackData, type BBox } from '../services/trackingWebSocketService';

interface TrackingVisualizerProps {
  videoUrl: string;
  cameraId: number;
}

export default function TrackingVisualizer({ videoUrl, cameraId }: TrackingVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [trackData, setTrackData] = useState<FrameTrackData | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [totalFrames, setTotalFrames] = useState(0);
  const [ws, setWs] = useState<WebSocket | null>(null);
  // const animationRef = useRef<number | null>(null);

  // Connect to WebSocket and setup video
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    const handleLoadedMetadata = () => {
      const fps = 30; 
      const duration = video.duration;
      const totalFrames = Math.floor(duration * fps);
      setTotalFrames(totalFrames);

      // Connect to tracking WebSocket
      const newWs = trackingWebSocketService.connectToTracks(
        cameraId,
        (data: FrameTrackData) => {
          setTrackData(data);
        },
        (error: string) => {
          console.error('Tracking error:', error);
        }
      );

      setWs(newWs);

      // Wait for connection to be ready, then request frame 1 (tracking data starts from frame 1)
      const checkAndRequest = () => {
        if (newWs.readyState === WebSocket.OPEN) {
          console.log('WebSocket ready, requesting frame 1');
          trackingWebSocketService.requestFrame(newWs, 1);
        } else if (newWs.readyState === WebSocket.CONNECTING) {
          // Still connecting, retry soon
          setTimeout(checkAndRequest, 50);
        } else {
          console.warn('WebSocket failed to connect');
        }
      };

      checkAndRequest();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', () => setIsPlaying(true));
    video.addEventListener('pause', () => setIsPlaying(false));

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', () => setIsPlaying(true));
      video.removeEventListener('pause', () => setIsPlaying(false));
    };
  }, [cameraId]);

  // Update current frame and request tracking data
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    let lastRequestedFrame = -1;

    const handleTimeUpdate = () => {
      const fps = 30;
      const frameNumber = Math.floor(video.currentTime * fps) + 1; // +1 because tracking data starts from frame 1
      setCurrentFrame(frameNumber);

      // Only request if frame changed to reduce WebSocket traffic
      if (frameNumber !== lastRequestedFrame && ws && ws.readyState === WebSocket.OPEN) {
        lastRequestedFrame = frameNumber;
        trackingWebSocketService.requestFrame(ws, frameNumber);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [ws]);

  // Draw bounding boxes on canvas
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current || !trackData) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0);

    // Debug: Check if 3D data is present
    if (trackData.bboxes && trackData.bboxes.length > 0) {
      console.log('Track data received:', {
        frameId: trackData.frame_id,
        boxCount: trackData.bboxes.length,
        has3D: trackData.bboxes.some(b => b.center_3d),
        sample: trackData.bboxes[0]
      });
    }

    // Draw bounding boxes
    if (trackData.bboxes && trackData.bboxes.length > 0) {
      trackData.bboxes.forEach((bbox: BBox) => {
        drawBBox(ctx, bbox);
      });
    }
  }, [trackData]);

  const drawBBox = (
    ctx: CanvasRenderingContext2D,
    bbox: BBox
  ) => {
    // Use projected 2D corner points if available
    if (!bbox.corners_2d || bbox.corners_2d.length === 0) {
      return;
    }

    const corners2D = bbox.corners_2d;

    // Color based on class
    const colors: Record<number, string> = {
      1: '#FF6B6B', // Red - Person
      2: '#4ECDC4', // Teal - Vehicle
      3: '#45B7D1', // Blue - Pallet
      5: '#FFA07A', // Salmon - Robot
    };
    const color = colors[bbox.class_id] || '#FFFFFF';

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    // Draw the 12 edges of the 3D box
    // Bottom face (indices 0,1,2,3)
    ctx.beginPath();
    ctx.moveTo(corners2D[0][0], corners2D[0][1]);
    ctx.lineTo(corners2D[1][0], corners2D[1][1]);
    ctx.lineTo(corners2D[2][0], corners2D[2][1]);
    ctx.lineTo(corners2D[3][0], corners2D[3][1]);
    ctx.lineTo(corners2D[0][0], corners2D[0][1]);
    ctx.stroke();

    // Top face (indices 4,5,6,7)
    ctx.beginPath();
    ctx.moveTo(corners2D[4][0], corners2D[4][1]);
    ctx.lineTo(corners2D[5][0], corners2D[5][1]);
    ctx.lineTo(corners2D[6][0], corners2D[6][1]);
    ctx.lineTo(corners2D[7][0], corners2D[7][1]);
    ctx.lineTo(corners2D[4][0], corners2D[4][1]);
    ctx.stroke();

    // Vertical edges
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(corners2D[i][0], corners2D[i][1]);
      ctx.lineTo(corners2D[i + 4][0], corners2D[i + 4][1]);
    }
    ctx.stroke();

    // Calculate center in 2D for labeling
    const centerX = corners2D.reduce((sum, p) => sum + p[0], 0) / 8;
    const centerY = corners2D.reduce((sum, p) => sum + p[1], 0) / 8;

    // Draw direction arrow (pointing forward along yaw)
    const arrowLength = 30;
    const arrowEndX = centerX + arrowLength * Math.cos(bbox.yaw);
    const arrowEndY = centerY + arrowLength * Math.sin(bbox.yaw);

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(arrowEndX, arrowEndY);
    ctx.stroke();

    // Draw arrowhead
    const angle = bbox.yaw;
    const arrowSize = 8;
    ctx.beginPath();
    ctx.moveTo(arrowEndX, arrowEndY);
    ctx.lineTo(arrowEndX - arrowSize * Math.cos(angle - Math.PI / 6), arrowEndY - arrowSize * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(arrowEndX, arrowEndY);
    ctx.lineTo(arrowEndX - arrowSize * Math.cos(angle + Math.PI / 6), arrowEndY - arrowSize * Math.sin(angle + Math.PI / 6));
    ctx.stroke();

    // Draw label background
    const label = `ID: ${bbox.object_id} (Class: ${bbox.class_id})`;
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = color;
    const textMetrics = ctx.measureText(label);
    const textHeight = 20;

    const labelX = centerX;
    const labelY = centerY - 40;

    ctx.fillRect(labelX - textMetrics.width / 2 - 4, labelY - textHeight - 4, textMetrics.width + 8, textHeight);

    // Draw label text
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(label, labelX, labelY - 8);
    ctx.textAlign = 'left';

    // Draw 3D info
    ctx.font = '12px Arial';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    const info = `(${bbox.center_3d[0].toFixed(1)}, ${bbox.center_3d[1].toFixed(1)}, ${bbox.center_3d[2].toFixed(1)}) Yaw: ${(bbox.yaw * 180 / Math.PI).toFixed(1)}°`;
    ctx.fillText(info, labelX, labelY + 10);
    ctx.textAlign = 'left';
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleFrameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const frameNumber = parseInt(e.target.value);
      const fps = 30;
      // Subtract 1 because tracking data starts from frame 1, but video starts at 0
      videoRef.current.currentTime = (frameNumber - 1) / fps;
      setCurrentFrame(frameNumber);
    }
  };

  const handleSeek = (offset: number) => {
    if (videoRef.current) {
      const fps = 30;
      const newFrame = Math.max(1, Math.min(currentFrame + offset, totalFrames)); // Start from frame 1
      videoRef.current.currentTime = (newFrame - 1) / fps;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="aspect-video bg-black relative">
        {/* Hidden video element */}
        <video
          ref={videoRef}
          src={videoUrl}
          crossOrigin="anonymous"
          className="hidden"
        />

        {/* Canvas for drawing */}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain bg-black"
        />

        {/* Loading indicator */}
        {!trackData && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-center">
              <div className="mb-3 text-lg">Loading tracking data...</div>
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-gray-100 space-y-4">
        {/* Play/Pause and info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayPause}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <button
              onClick={() => handleSeek(-1)}
              className="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700"
              title="Previous frame"
            >
              ⏮ Frame -1
            </button>

            <button
              onClick={() => handleSeek(1)}
              className="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700"
              title="Next frame"
            >
              Frame +1 ⏭
            </button>
          </div>

          <div className="text-gray-700 font-medium">
            Frame: {currentFrame} / {totalFrames}
          </div>
        </div>

        {/* Frame slider */}
        <div className="space-y-2">
          <input
            type="range"
            min="1"
            max={totalFrames}
            value={currentFrame}
            onChange={handleFrameChange}
            className="w-full"
          />
        </div>

        {/* Tracking info */}
        {trackData && trackData.bboxes.length > 0 && (
          <div className="bg-white rounded p-3 text-sm">
            <div className="font-bold mb-2">
              Detected Objects: {trackData.bboxes.length}
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {trackData.bboxes.map((bbox: BBox) => (
                <div key={`${bbox.object_id}-${trackData.frame_id}`} className="text-gray-700">
                  <span className="font-semibold">ID {bbox.object_id}:</span> Class {bbox.class_id}
                  {bbox.center_3d && (
                    <span className="text-xs text-gray-500 ml-2">
                      3D: ({bbox.center_3d[0].toFixed(1)}, {bbox.center_3d[1].toFixed(1)}, {bbox.center_3d[2].toFixed(1)})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="bg-white rounded p-3 text-sm">
          <div className="font-bold mb-2">Class Legend:</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 border border-black"></div>
              <span>Person (1)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-teal-500 border border-black"></div>
              <span>Vehicle (2)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-400 border border-black"></div>
              <span>Pallet (3)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-300 border border-black"></div>
              <span>Robot (5)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
