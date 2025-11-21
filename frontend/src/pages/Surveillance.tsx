import { Camera, Video, AlertCircle, Maximize2, Grid3X3, Play, Pause } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { videoService } from '../services/videoService';
import TrackingVisualizer from '../components/TrackingVisualizer';
import GridTrackingVisualizer from '../components/GridTrackingVisualizer';
import { multiCameraTrackingWebSocketService, type MultiCameraFrameData, type BBox } from '../services/multitrackingWebsocketService';

interface CameraFeed {
  id: string;
  name: string;
  zone: string;
  src: string;  
  status: 'online' | 'offline' | 'recording';
  cameraId: number;
}

export default function SurveillancePage() {
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [gridMode, setGridMode] = useState<'2x2' | '3x3' | '1x1'>('2x2');
  
  // Multi-camera tracking state
  const [multiFrameData, setMultiFrameData] = useState<MultiCameraFrameData | null>(null);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [totalFrames, setTotalFrames] = useState(3000);
  const [isPlaying, setIsPlaying] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const playbackIntervalRef = useRef<number | null>(null);

  const cameras: CameraFeed[] = [
    { id: 'cam00', name: 'Camera', zone: 'Main Camera', src: videoService.getVideoUrl('Camera.mp4'), status: 'online', cameraId: 0 },
    { id: 'cam01', name: 'Camera 01', zone: 'Loading Dock A', src: videoService.getVideoUrl('Camera_01.mp4'), status: 'online', cameraId: 1 },
    { id: 'cam02', name: 'Camera 02', zone: 'Aisle 1-4', src: videoService.getVideoUrl('Camera_02.mp4'), status: 'online', cameraId: 2 },
    { id: 'cam03', name: 'Camera 03', zone: 'Aisle 5-8', src: videoService.getVideoUrl('Camera_03.mp4'), status: 'online', cameraId: 3 },
    { id: 'cam04', name: 'Camera 04', zone: 'Packing Area', src: videoService.getVideoUrl('Camera_04.mp4'), status: 'online', cameraId: 4 },
    { id: 'cam05', name: 'Camera 05', zone: 'Receiving Bay', src: videoService.getVideoUrl('Camera_05.mp4'), status: 'online', cameraId: 5 },
    { id: 'cam06', name: 'Camera 06', zone: 'High-Value Storage', src: videoService.getVideoUrl('Camera_06.mp4'), status: 'online', cameraId: 6 },
    { id: 'cam07', name: 'Camera 07', zone: 'Main Entrance', src: videoService.getVideoUrl('Camera_07.mp4'), status: 'online', cameraId: 7 },
  ];

  // Connect to multi-camera WebSocket for grid views
  useEffect(() => {
    if (gridMode === '1x1') {
      // Disconnect multi-camera WebSocket when in fullscreen mode
      if (wsRef.current) {
        multiCameraTrackingWebSocketService.disconnect(wsRef.current);
        wsRef.current = null;
      }
      return;
    }

    // Connect to multi-camera tracking
    const ws = multiCameraTrackingWebSocketService.connect(
      (data: MultiCameraFrameData) => {
        setMultiFrameData(data);
        setCurrentFrame(data.frame_id);
      },
      (error: string) => {
        console.error('Multi-camera tracking error:', error);
      },
      () => {
        console.log('Multi-camera WebSocket closed');
      }
    );

    wsRef.current = ws;

    // Wait for connection and request initial frame
    const checkAndRequest = () => {
      if (ws.readyState === WebSocket.OPEN) {
        multiCameraTrackingWebSocketService.requestFrame(ws, 1);
      } else if (ws.readyState === WebSocket.CONNECTING) {
        setTimeout(checkAndRequest, 50);
      }
    };
    checkAndRequest();

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
      multiCameraTrackingWebSocketService.disconnect(ws);
    };
  }, [gridMode]);

  // Handle playback
  useEffect(() => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }

    const isGridMode = gridMode === '2x2' || gridMode === '3x3';
    
    if (isPlaying && isGridMode) {
      playbackIntervalRef.current = window.setInterval(() => {
        setCurrentFrame(prev => {
          const next = prev + 1;
          if (next > totalFrames) {
            setIsPlaying(false);
            return totalFrames;
          }
          
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            multiCameraTrackingWebSocketService.requestFrame(wsRef.current, next);
          }
          
          return next;
        });
      }, 1000 / 30); // 30 FPS
    }

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [isPlaying, gridMode, totalFrames]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleFrameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const frameNumber = parseInt(e.target.value);
    setCurrentFrame(frameNumber);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      multiCameraTrackingWebSocketService.requestFrame(wsRef.current, frameNumber);
    }
  };

  const handleSeek = (offset: number) => {
    const newFrame = Math.max(1, Math.min(currentFrame + offset, totalFrames));
    setCurrentFrame(newFrame);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      multiCameraTrackingWebSocketService.requestFrame(wsRef.current, newFrame);
    }
  };

  const getCameraBBoxes = (cameraId: number): BBox[] => {
    if (!multiFrameData) return [];
    return multiCameraTrackingWebSocketService.getCameraBBoxes(multiFrameData, cameraId);
  };

  const visibleCameras = gridMode === '3x3' ? cameras : 
                         gridMode === '2x2' ? cameras.slice(0, 4) : 
                         cameras.filter(c => c.id === selectedCamera);

  const gridCols = gridMode === '3x3' ? 'grid-cols-3' : 
                   gridMode === '2x2' ? 'grid-cols-2' : 
                   'grid-cols-1';

  const selectedCameraData = cameras.find(c => c.id === selectedCamera);

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      {/* Fullscreen Tracking View */}
      {gridMode === '1x1' && selectedCameraData && (
        <div className="h-full w-full flex flex-col">
          <div className="flex-1 ">
            <TrackingVisualizer 
              videoUrl={selectedCameraData.src} 
              cameraId={selectedCameraData.cameraId}
            />
          </div>
          <div className="p-4 bg-white text-gray-700 border-t flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">{selectedCameraData.name}</h3>
              <p className="text-sm text-gray-600">{selectedCameraData.zone}</p>
            </div>
            <button
              onClick={() => {
                setGridMode('2x2');
                setSelectedCamera(null);
              }}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 transition-colors font-medium"
            >
              <Grid3X3 className="w-5 h-5" />
              Back to Grid View
            </button>
          </div>
        </div>
      )}

      {/* Grid View */}
      {gridMode !== '1x1' && (
        <div className="max-w-max mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Camera className="w-9 h-9 text-blue-600" />
                Surveillance
              </h2>
              <p className="text-gray-600 mt-2">Live monitoring from all warehouse cameras</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setGridMode('1x1')}
                className={`p-3 rounded-lg border border-gray-300 hover:bg-gray-100`}
              >
                <Maximize2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setGridMode('2x2')}
                className={`p-3 rounded-lg border ${gridMode === '2x2' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-100'}`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setGridMode('3x3')}
                className={`p-3 rounded-lg border ${gridMode === '3x3' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-100'}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Camera Status Summary */}
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Online: <strong>{cameras.filter(c => c.status === 'online').length}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600">Recording: <strong>{cameras.filter(c => c.status === 'recording').length}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-gray-600">Offline: <strong>{cameras.filter(c => c.status === 'offline').length}</strong></span>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className={`grid ${gridCols} gap-6 auto-rows-fr`}>
          {visibleCameras.map((camera) => (
            <div
              key={camera.id}
              className="relative bg-black rounded-xl overflow-hidden shadow-lg group cursor-pointer"
              onClick={() => {
                setSelectedCamera(camera.id);
                setGridMode('1x1');
              }}
            >
              {/* Grid Tracking Visualizer with BBoxes */}
              <GridTrackingVisualizer
                videoUrl={camera.src}
                cameraId={camera.cameraId}
                bboxes={getCameraBBoxes(camera.cameraId)}
                isPlaying={isPlaying}
                currentFrame={currentFrame}
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent pointer-events-none">
                {/* Top Bar */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start">
                  <div>
                    <h4 className="text-white font-semibold text-lg">{camera.name}</h4>
                    <p className="text-white/80 text-sm">{camera.zone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {camera.status === 'recording' && (
                      <div className="flex items-center gap-2 bg-red-600/90 px-3 py-1 rounded-full">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span className="text-white text-xs font-medium">REC</span>
                      </div>
                    )}
                    <div className={`w-3 h-3 rounded-full ${camera.status === 'online' ? 'bg-green-500' : camera.status === 'recording' ? 'bg-red-500' : 'bg-gray-500'}`} />
                  </div>
                </div>

                {/* Bottom Bar */}
                <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-center text-white">
                  <div className="flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    <span className="text-sm">Live • 1080p</span>
                    {multiFrameData && (
                      <span className="text-sm ml-2">
                        • {getCameraBBoxes(camera.cameraId).length} objects
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCamera(camera.id);
                      setGridMode('1x1');
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 backdrop-blur-sm p-2 rounded-lg hover:bg-white/30"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Offline Overlay */}
              {camera.status === 'offline' && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-3" />
                    <p className="text-white text-lg font-medium">Camera Offline</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Grid Controls */}
        {gridMode !== '1x1' && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-4 space-y-4">
            {/* Play/Pause and info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePlayPause}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium flex items-center gap-2"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>

                <button
                  onClick={() => handleSeek(-1)}
                  className="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700"
                  title="Previous frame"
                >
                  ◀ Frame -1
                </button>

                <button
                  onClick={() => handleSeek(1)}
                  className="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700"
                  title="Next frame"
                >
                  Frame +1 ▶
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
            {multiFrameData && (
              <div className="bg-gray-50 rounded p-3 text-sm text-gray-700">
                <div className="font-bold mb-2">
                  Total Objects Across All Cameras: {Object.values(multiFrameData.cameras).reduce((sum, cam) => sum + cam.bboxes.length, 0)}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.values(multiFrameData.cameras).map((camData) => {
                    const camera = cameras.find(c => c.cameraId === camData.camera_id);
                    return (
                      <div key={camData.camera_id} className="text-xs">
                        <span className="font-semibold">{camera?.name}:</span> {camData.bboxes.length} objects
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        </div>
      )}
    </main>
  );
}