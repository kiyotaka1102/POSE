import { useEffect, useRef } from 'react';
import { type BBox } from '../services/multitrackingWebsocketService';

interface GridTrackingVisualizerProps {
  videoUrl: string;
  cameraId: number;
  bboxes: BBox[] | null;
  isPlaying: boolean;
  currentFrame: number;
  onFrameReady?: () => void;
}

export default function GridTrackingVisualizer({ 
  videoUrl, 
  cameraId, 
  bboxes,
  isPlaying,
  currentFrame,
  onFrameReady 
}: GridTrackingVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync video playback with global state
  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const fps = 30;
    const targetTime = (currentFrame - 1) / fps;
    
    // Only seek if difference is significant (more than 0.1 seconds)
    if (Math.abs(video.currentTime - targetTime) > 0.1) {
      video.currentTime = targetTime;
    }
  }, [currentFrame]);

  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    
    if (isPlaying) {
      video.play().catch(err => console.error('Play error:', err));
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Draw bounding boxes on canvas
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const drawFrame = () => {
      // Set canvas size to match video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Draw video frame
      ctx.drawImage(video, 0, 0);

      // Draw bounding boxes if available
      if (bboxes && bboxes.length > 0) {
        bboxes.forEach((bbox: BBox) => {
          drawBBox(ctx, bbox);
        });
      }

      requestAnimationFrame(drawFrame);
    };

    drawFrame();
  }, [bboxes]);

  const drawBBox = (ctx: CanvasRenderingContext2D, bbox: BBox) => {
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
      4: '#C71585', // FourierGR1T2
      5: '#FFD700', // AgilityDigit
    };
    const color = colors[bbox.class_id] || '#FFFFFF';

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Draw 3D box edges
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

    // 2D center for arrow placement
    const centerX = corners2D.reduce((s, p) => s + p[0], 0) / 8;
    const centerY = corners2D.reduce((s, p) => s + p[1], 0) / 8;

    // Draw yaw arrow
    if (bbox.yaw_arrow?.start_2d && bbox.yaw_arrow?.end_2d) {
      const [sx, sy] = bbox.yaw_arrow.start_2d;
      const [ex, ey] = bbox.yaw_arrow.end_2d;

      if (
        Number.isFinite(sx) && Number.isFinite(sy) &&
        Number.isFinite(ex) && Number.isFinite(ey)
      ) {
        const dx = ex - sx;
        const dy = ey - sy;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        const maxArrowLength = 40;
        const desiredLength = Math.min(length * 0.7, maxArrowLength);
        const scale = desiredLength / length;

        const newEx = sx + dx * scale;
        const newEy = sy + dy * scale;

        const arrowSize = 5;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
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
      // Fallback: draw arrow from center
      const baseArrowLength = 30;
      const maxArrowLength = 40;
      const arrowLength = Math.min(baseArrowLength, maxArrowLength);

      const arrowEndX = centerX + arrowLength * Math.cos(bbox.yaw);
      const arrowEndY = centerY + arrowLength * Math.sin(bbox.yaw);
      const angle = bbox.yaw;
      const arrowSize = 6;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
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

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  };

  return (
    <div className="relative w-full h-full bg-black">
      {/* Hidden video element */}
      <video
        ref={videoRef}
        src={videoUrl}
        crossOrigin="anonymous"
        className="hidden"
        muted
        playsInline
      />

      {/* Canvas for drawing */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain"
      />
    </div>
  );
}