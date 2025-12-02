import { Camera, Video, AlertCircle, Maximize2, Grid3X3 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { videoService } from '../services/videoService';
import TrackingVisualizer from '../components/TrackingVisualizer';

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
  // const [cameraTimes, setCameraTimes] = useState<Record<number, number>>({});
  const [syncTime, setSyncTime] = useState<number>(0);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
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
  useEffect(() => {
    const syncAllVideos = () => {
      Object.keys(videoRefs.current).forEach(id => {
        const video = videoRefs.current[id];
        if (video && video.readyState >= 1) { // HAVE_METADATA trở lên
          if (Math.abs(video.currentTime - syncTime) > 0.3) {
            video.currentTime = syncTime;
          }
        }
      });
    };

    syncAllVideos();
    const interval = setInterval(syncAllVideos, 300);
    const timeout = setTimeout(() => clearInterval(interval), 8000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [syncTime]);
  const visibleCameras = gridMode === '3x3' ? cameras : 
                         gridMode === '2x2' ? cameras.slice(0, 4) : 
                         cameras.filter(c => c.id === selectedCamera);
  const gridCols = gridMode === '3x3' ? 'grid-cols-3' : 
                   gridMode === '2x2' ? 'grid-cols-2' : 
                   'grid-cols-1';
  const handleReturnToGrid = (currentTime: number) => {
        setSyncTime(currentTime); 
        setGridMode('2x2');
        setSelectedCamera(null);
    };
  const handleGridVideoTimeUpdate = (newTime: number) => {
        setSyncTime(newTime);
    };
  const initialTimeForSelected = syncTime;
  const selectedCameraData = cameras.find(c => c.id === selectedCamera);

  const handleCameraSelect = (cameraId: string, currentTimeInSeconds?: number) => {
        // Nếu không có currentTimeInSeconds, lấy từ videoRefs
        let timeToSync = currentTimeInSeconds;
        if (timeToSync === undefined || timeToSync === null) {
          const videoElement = videoRefs.current[cameraId];
          if (videoElement && videoElement.readyState >= 1) {
            timeToSync = videoElement.currentTime;
          } else {
            timeToSync = syncTime; // Fallback to current syncTime
          }
        }
        
        setSelectedCamera(cameraId);
        setSyncTime(timeToSync); 
        setGridMode('1x1');
    };
  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      {/* Fullscreen Tracking View */}
      {gridMode === '1x1' && selectedCameraData && (
        <div className="h-full w-full flex flex-col">
          <div className="flex-1 ">
            <TrackingVisualizer 
              videoUrl={selectedCameraData.src} 
              cameraId={selectedCameraData.cameraId}
              initialTime={initialTimeForSelected}
              onReturnToGrid={handleReturnToGrid}
            />
          </div>
          <div className="p-4 bg-white text-gray-700 border-t flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">{selectedCameraData.name}</h3>
              <p className="text-sm text-gray-600">{selectedCameraData.zone}</p>
            </div>
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
                onClick={() => setGridMode('2x2')}
                className={`bg-cyan-400 p-3 rounded-lg border ${gridMode === '2x2' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-100'}`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setGridMode('3x3')}
                className={`bg-cyan-400 p-3 rounded-lg border ${gridMode === '3x3' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-100'}`}
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
              onClick={(e) => {
                const videoElement = e.currentTarget.querySelector('video');
                if (videoElement) {
                  handleCameraSelect(camera.id, videoElement.currentTime);
                }

              }}
            >
              {/* Video Element */}
              <video
                key= {camera.id}
                ref={(el) => (videoRefs.current[camera.id] = el)}
                src={camera.src}
                autoPlay
                loop
                muted
                playsInline
                onLoadedMetadata={(e) => {
                  if (syncTime > 0) {
                    e.currentTarget.currentTime = syncTime;
                  }
                }}
                onTimeUpdate={(e) => {
                                    if (camera.id === 'cam00') {
                                        handleGridVideoTimeUpdate(e.currentTarget.currentTime);
                                    }
                                }}
                className="w-full h-full object-cover"
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
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const videoElement = videoRefs.current[camera.id];
                      if (videoElement && videoElement.readyState >= 1) {
                        handleCameraSelect(camera.id, videoElement.currentTime);
                      } else {
                        handleCameraSelect(camera.id);
                      }
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

        </div>
      )}
    </main>
  );
}