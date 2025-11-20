# POSE Frontend & Backend Integration Guide

## Current Status

### Frontend (✅ Completed)
- **Video Service** (`videoService.ts`): REST API calls for videos
  - `getVideosList()` - Fetches available videos
  - `getVideoUrl(filename)` - Returns video URL
  - `checkHealth()` - Checks API status

- **Tracking WebSocket Service** (`trackingWebSocketService.ts`): WebSocket for tracking data
  - `connectToTracks()` - Connects to tracking stream
  - `requestFrame()` - Requests specific frame data
  - `ping()` - Keep-alive signal
  - `disconnect()` - Closes connection

- **Surveillance Page** (`Surveillance.tsx`): Main component
  - Displays 8 camera feeds
  - Shows API connection status
  - Grid/fullscreen modes

### Backend (✅ Completed)
```
app/
├── main.py                 # FastAPI application
├── services/
│   ├── tracking_service.py # Load & manage tracks
│   ├── calibration_service.py # Camera calibration
│   └── projection_service.py # 3D→2D projection
├── websockets/
│   ├── tracking_manager.py # Track streaming
│   └── stream_manager.py   # Video streaming
├── routes/
│   ├── root.py            # Root endpoint
│   └── info.py            # Info endpoints
└── models/
    └── schemas.py         # Pydantic models
```

## Why Services Aren't Being Called

The services **ARE** being called:

1. **`videoService.getVideoUrl()`** - Called in Surveillance.tsx to build video URLs
2. **`videoService.checkHealth()`** - Called in useEffect to check API status
3. **`trackingWebSocketService`** - Ready to be called when needed

The issue was that `checkHealth()` wasn't being invoked initially, so the component didn't know if the API was available.

## Fixed Issues

✅ Added API health check on component mount
✅ Added error display when backend is unavailable
✅ Fixed TypeScript `any` type with proper interfaces (FrameTrackData, BBox)
✅ Separated backend into modular architecture

## How to Test

### 1. Start Backend
```bash
cd D:\POSE\backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start Frontend
```bash
cd D:\POSE\frontend
npm run dev
```

### 3. Test API Endpoints
- Health: `curl http://localhost:8000/api/health`
- Videos: `curl http://localhost:8000/api/videos/list`
- Tracks Info: `curl http://localhost:8000/api/tracks/info`
- Calibration: `curl http://localhost:8000/api/calibration/info`

### 4. Test WebSocket
- Tracks: `ws://localhost:8000/ws/tracks/0`
- Stream: `ws://localhost:8000/ws/stream/0`

## Next Steps

1. Create video display component with actual playback
2. Create tracking overlay component (canvas to draw 3D boxes)
3. Create real-time tracking display with WebSocket
4. Add camera feed grid with live tracking
5. Implement BEV (Bird's Eye View) visualization
