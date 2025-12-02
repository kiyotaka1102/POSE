import { useEffect, useRef, useState, useCallback } from 'react';
import { trackingWebSocketService, type FrameTrackData, type BBox } from '../services/trackingWebSocketService';
import { Grid3X3 } from 'lucide-react';

interface TrackingVisualizerProps {
  videoUrl: string;
  cameraId: number;
  initialTime: number;
  onReturnToGrid: (currentTime: number) => void;
}

export default function TrackingVisualizer({ videoUrl, cameraId, initialTime, onReturnToGrid }: TrackingVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [trackData, setTrackData] = useState<FrameTrackData | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [totalFrames, setTotalFrames] = useState(0);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [selectedBBox, setSelectedBBox] = useState<BBox | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Ref để detect click outside
  const popupRef = useRef<HTMLDivElement>(null);

  // Đóng popup khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setSelectedBBox(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Connect to WebSocket and setup video
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    console.log('Setting up video and WebSocket for cameraId:', cameraId);
    const handleLoadedMetadata = () => {
      const fps = 30; 
      const duration = video.duration;
      const totalFrames = Math.floor(duration * fps);
      setTotalFrames(totalFrames);
      console.log('Video metadata loaded. Duration:', duration, 'Total Frames:', totalFrames, 'Initial Time:', initialTime);
      if (initialTime > 0 && initialTime <= duration) {
          video.currentTime = initialTime;
          const initialFrame = Math.floor(initialTime * fps) + 1;
          console.log('Setting initial frame to:', initialFrame);
          setCurrentFrame(initialFrame);
      } else {
          setCurrentFrame(1);
      }
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

      const checkAndRequest = () => {
        if (newWs.readyState === WebSocket.OPEN) {
          console.log('WebSocket ready, requesting frame');
          const fps = 30;
          const frameToRequest = initialTime > 0 ? Math.floor(initialTime * fps) + 1 : 1;
          trackingWebSocketService.requestFrame(newWs, frameToRequest);
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

      ws?.close();
      setWs(null);
    };
  }, [cameraId, onReturnToGrid]);

  // Sync video and frame when initialTime changes (after metadata is loaded)
  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const fps = 30;
    
    // Only sync if video metadata is already loaded
    if (video.readyState >= 1 && initialTime > 0 && initialTime <= video.duration) {
      const targetFrame = Math.floor(initialTime * fps) + 1;
      const currentFrameFromTime = Math.floor(video.currentTime * fps) + 1;
      
      // Only seek if there's a significant difference (more than 1 frame)
      if (Math.abs(targetFrame - currentFrameFromTime) > 1) {
        console.log('Syncing video to initialTime:', initialTime, 'Frame:', targetFrame);
        video.currentTime = initialTime;
        setCurrentFrame(targetFrame);
        
        // Request tracking data for the new frame
        if (ws && ws.readyState === WebSocket.OPEN) {
          trackingWebSocketService.requestFrame(ws, targetFrame);
        }
      }
    }
  }, [initialTime, ws]);

  // Update current frame and request tracking data
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    let lastRequestedFrame = -1;

    const handleTimeUpdate = () => {
      const fps = 30;
      const frameNumber = Math.floor(video.currentTime * fps) + 1;
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
        drawBBox(ctx, bbox, selectedBBox?.object_id === bbox.object_id);
      });
    }
  }, [trackData, selectedBBox]);

  // Xử lý click lên canvas
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !trackData?.bboxes) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const videoX = x * scaleX;
    const videoY = y * scaleY;

    let clickedBBox: BBox | null = null;
    let minDistance = Infinity;

    for (const bbox of trackData.bboxes) {
      if (!bbox.corners_2d || bbox.corners_2d.length === 0) continue;

      const centerX = bbox.corners_2d.reduce((s, p) => s + p[0], 0) / 8;
      const centerY = bbox.corners_2d.reduce((s, p) => s + p[1], 0) / 8;

      const dist = Math.hypot(centerX - videoX, centerY - videoY);
      if (dist < 80 && dist < minDistance) { // 80px tolerance
        minDistance = dist;
        clickedBBox = bbox;
      }
    }

    if (clickedBBox) {
      if (selectedBBox?.object_id === clickedBBox.object_id) {
        setSelectedBBox(null);
      } else {
        setSelectedBBox(clickedBBox);
        setPopupPosition({ x, y: y + 10 }); // mũi tên xuống dưới
      }
    } else {
      setSelectedBBox(null);
    }
  }, [trackData, selectedBBox]);

  const drawBBox = (
    ctx: CanvasRenderingContext2D,
    bbox: BBox,
    isSelected: boolean = false
  ) => {
    if (!bbox.corners_2d || bbox.corners_2d.length === 0) {
      return;
    }

    const corners2D = bbox.corners_2d;

    // Color mapping
    const colors: Record<number, string> = {
      0: '#FF6B6B', // Person
      1: '#4ECDC4', // Forklift
      2: '#45B7D1', // NovaCarter
      3: '#F0E68C', // Transporter
      4: '#C71585', // NovaCarter
      5: '#FFD700', // AgilityDigit
    };
    const color = colors[bbox.class_id] || '#FFFFFF';

    // Highlight khi chọn
    ctx.strokeStyle = isSelected ? '#FFFF00' : color;
    ctx.lineWidth = isSelected ? 4 : 2;
    ctx.shadowBlur = isSelected ? 10 : 0;
    ctx.shadowColor = isSelected ? '#FFFF00' : 'transparent';

    // ── Draw 3D box edges ──
    // Bottom face (0,1,2,3)
    ctx.beginPath();
    ctx.moveTo(corners2D[0][0], corners2D[0][1]);
    ctx.lineTo(corners2D[1][0], corners2D[1][1]);
    ctx.lineTo(corners2D[2][0], corners2D[2][1]);
    ctx.lineTo(corners2D[3][0], corners2D[3][1]);
    ctx.lineTo(corners2D[0][0], corners2D[0][1]);
    ctx.stroke();

    // Top face (4,5,6,7)
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

    // ── 2D center (dùng để đặt label) ──
    const centerX = corners2D.reduce((s, p) => s + p[0], 0) / 8;
    const centerY = corners2D.reduce((s, p) => s + p[1], 0) / 8;

    // ── Draw yaw arrow (ưu tiên dữ liệu đã chiếu từ backend) ──
    if (bbox.yaw_arrow?.start_2d && bbox.yaw_arrow?.end_2d) {
      const [sx, sy] = bbox.yaw_arrow.start_2d;
      const [ex, ey] = bbox.yaw_arrow.end_2d;

      // Kiểm tra tính hợp lệ
      if (
        Number.isFinite(sx) && Number.isFinite(sy) &&
        Number.isFinite(ex) && Number.isFinite(ey)
      ) {
        const dx = ex - sx;
        const dy = ey - sy;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Rút ngắn arrow về ~60-70% độ dài gốc (hoặc giới hạn tối đa)
        const maxArrowLength = 60; // pixel - điều chỉnh theo ý thích
        const desiredLength = Math.min(length * 0.7, maxArrowLength);
        const scale = desiredLength / length;

        const newEx = sx + dx * scale;
        const newEy = sy + dy * scale;

        const arrowSize = 6; // kích thước đầu mũi tên

        // Arrow line
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(newEx, newEy);
        ctx.stroke();

        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(newEx, newEy);
        ctx.lineTo(
          newEx - arrowSize * Math.cos(angle - Math.PI / 6),
          newEy - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(newEx, newEy);
        ctx.lineTo(
          newEx - arrowSize * Math.cos(angle + Math.PI / 6),
          newEy - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
    } else {
      // ── Fallback: vẽ arrow từ center (cũng rút ngắn) ──
      const baseArrowLength = 40; // giảm từ 10 → 40 pixels là hợp lý trên khung hình
      const maxArrowLength = 50;
      const arrowLength = Math.min(baseArrowLength, maxArrowLength);

      const arrowEndX = centerX + arrowLength * Math.cos(bbox.yaw);
      const arrowEndY = centerY + arrowLength * Math.sin(bbox.yaw);
      const angle = bbox.yaw;
      const arrowSize = 8;

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(arrowEndX, arrowEndY);
      ctx.stroke();

      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(arrowEndX, arrowEndY);
      ctx.lineTo(
        arrowEndX - arrowSize * Math.cos(angle - Math.PI / 6),
        arrowEndY - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(arrowEndX, arrowEndY);
      ctx.lineTo(
        arrowEndX - arrowSize * Math.cos(angle + Math.PI / 6),
        arrowEndY - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    }

    // 3D coordinates + yaw
    ctx.font = '12px Arial';
    ctx.fillStyle = color;

    // Reset
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
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

  // Map class_id to name for display
  const getClassName = (classId: number) => {
    const classMap: Record<number, string> = {
      0: 'Person',
      1: 'Forklift',
      2: 'NovaCarter',
      3: 'Transporter',
      4: 'FourierGR1T2',
      5: 'AgilityDigit',
    };
    return classMap[classId] || 'Unknown';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden relative"> 
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
          className="w-full h-full object-contain bg-black cursor-pointer" // Thêm cursor pointer
          onClick={handleCanvasClick}
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

      {/* Popup chi tiết bbox */}
      {selectedBBox && (
        <div
          ref={popupRef}
          className="absolute bg-white rounded-lg shadow-xl p-4 z-50 max-w-xs pointer-events-auto"
          style={{
            top: `${popupPosition.y}px`,
            left: `${popupPosition.x}px`,
            transform: 'translate(-50%, 0)', // Căn giữa ngang
          }}
        >
          {/* Mũi tên chỉ lên trên (triangle) */}
          <div
            className="absolute w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-white"
            style={{
              top: '-8px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          />
          <h3 className="font-bold text-lg mb-2 text-gray-700">Object Details</h3>
          <div className="space-y-1 text-sm text-gray-700">
            <p><span className="font-semibold">ID:</span> {selectedBBox.object_id}</p>
            <p><span className="font-semibold">Class:</span> {getClassName(selectedBBox.class_id)} ({selectedBBox.class_id})</p>
            {selectedBBox.center_3d && (
              <p><span className="font-semibold">3D Position:</span> ({selectedBBox.center_3d[0].toFixed(2)}, {selectedBBox.center_3d[1].toFixed(2)}, {selectedBBox.center_3d[2].toFixed(2)})</p>
            )}
            <p><span className="font-semibold">Yaw:</span> {(selectedBBox.yaw * 180 / Math.PI).toFixed(0)}°</p>
            {/* Thêm các info khác nếu có, ví dụ dimensions nếu BBox có field size_3d */}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="p-4 bg-gray-100 space-y-4">
        {/* Play/Pause and info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayPause}
              className="bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700 font-medium"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <button
              onClick={() => handleSeek(-1)}
              className="bg-cyan-600 text-white px-3 py-2 rounded hover:bg-cyan-700"
              title="Previous frame"
            >
              ⏮ Frame -1
            </button>

            <button
              onClick={() => handleSeek(1)}
              className="bg-cyan-600 text-white px-3 py-2 rounded hover:bg-cyan-700"
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
          <div className="bg-white rounded p-3 text-sm text-gray-700">
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
      </div>
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => {
              if (videoRef.current) {
                const currentTime = videoRef.current.currentTime;
                // videoRef.current.pause();
                onReturnToGrid(currentTime);
              }
            }}
            className="bg-cyan-500 hover:bg-white text-gray-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-medium backdrop-blur-sm"
          >
            <Grid3X3 className="w-5 h-5" />
            Back
          </button>
        </div>
    </div>
  );
}