import { useEffect, useState } from 'react';
import { videoService } from '../services/videoService';
import { trackingWebSocketService, type FrameTrackData } from '../services/trackingWebSocketService';

export default function APITestPage() {
  const [videos, setVideos] = useState<string[]>([]);
  const [tracksInfo, setTracksInfo] = useState<any>(null);
  const [calibInfo, setCalibInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackData, setTrackData] = useState<FrameTrackData | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check health
        await videoService.checkHealth();
        console.log('✓ API health check passed');

        // Get videos list
        const videosList = await videoService.getVideosList();
        setVideos(videosList.videos || []);
        console.log('✓ Videos loaded:', videosList);

        // Get tracks info (using fetch since we updated routes)
        const tracksRes = await fetch('http://localhost:8000/api/tracks/info');
        const tracksData = await tracksRes.json();
        setTracksInfo(tracksData);
        console.log('✓ Tracks info:', tracksData);

        // Get calibration info
        const calibRes = await fetch('http://localhost:8000/api/calibration/info');
        const calibData = await calibRes.json();
        setCalibInfo(calibData);
        console.log('✓ Calibration info:', calibData);

        setLoading(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        setLoading(false);
        console.error('✗ Error:', err);
      }
    };

    fetchData();
  }, []);

  const connectToTracks = (cameraId: number, frameId: number) => {
    if (ws) {
      trackingWebSocketService.disconnect(ws);
    }

    const newWs = trackingWebSocketService.connectToTracks(
      cameraId,
      (data: FrameTrackData) => {
        console.log('Track data received:', data);
        setTrackData(data);
      },
      (error: string) => {
        console.error('WebSocket error:', error);
        setError(error);
      }
    );

    setWs(newWs);

    // Request frame after connection
    setTimeout(() => {
      trackingWebSocketService.requestFrame(newWs, frameId);
    }, 500);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading API data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">API Test Page</h1>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700"><strong>Error:</strong> {error}</p>
        </div>
      )}

      {!error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Videos */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Videos ({videos.length})</h2>
            <ul className="space-y-2">
              {videos.map((video) => (
                <li key={video} className="text-gray-700 text-sm">
                  {video}
                </li>
              ))}
            </ul>
          </div>

          {/* Tracks Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Track Information</h2>
            {tracksInfo && (
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Total Frames:</strong> {tracksInfo.total_frames}
                </p>
                <p>
                  <strong>Min Frame:</strong> {tracksInfo.min_frame}
                </p>
                <p>
                  <strong>Max Frame:</strong> {tracksInfo.max_frame}
                </p>
                <p>
                  <strong>Total Tracks:</strong> {tracksInfo.total_tracks}
                </p>
              </div>
            )}
          </div>

          {/* Calibration Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Calibration Information</h2>
            {calibInfo && (
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Cameras:</strong> {calibInfo.cameras?.join(', ')}
                </p>
                <p>
                  <strong>Total Cameras:</strong> {calibInfo.total_cameras}
                </p>
              </div>
            )}
          </div>

          {/* WebSocket Test */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">WebSocket Test</h2>
            <button
              onClick={() => connectToTracks(0, 100)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
            >
              Request Frame 100 from Camera 0
            </button>
            {trackData && (
              <div className="mt-4 p-4 bg-blue-50 rounded text-sm">
                <p>
                  <strong>Frame:</strong> {trackData.frame_id}
                </p>
                <p>
                  <strong>Camera:</strong> {trackData.camera_id}
                </p>
                <p>
                  <strong>Bounding Boxes:</strong> {trackData.bboxes.length}
                </p>
                {trackData.bboxes.length > 0 && (
                  <pre className="mt-2 bg-white p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(trackData.bboxes[0], null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
