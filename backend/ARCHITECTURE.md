# Backend Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Application entry point
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py          # Pydantic models for request/response
│   ├── services/
│   │   ├── __init__.py
│   │   ├── tracking_service.py # Track data loading and management
│   │   ├── calibration_service.py # Camera calibration management
│   │   └── projection_service.py # 3D to 2D projection
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── root.py            # Root endpoint
│   │   └── info.py            # Info endpoints
│   └── websockets/
│       ├── __init__.py
│       ├── tracking_manager.py # WebSocket tracking management
│       └── stream_manager.py   # WebSocket video streaming
├── data/
│   └── Warehouse_017/
│       ├── videos/
│       ├── track1_class.txt
│       └── calibration.json
├── requirements.txt
└── README.md
```

## Services

### TrackingService
- Loads tracking data from `track1_class.txt`
- Provides methods to retrieve tracks by frame
- Manages track metadata

### CalibrationService
- Loads camera calibration from JSON
- Stores intrinsic, extrinsic, and projection matrices
- Provides camera parameters by ID

### ProjectionService
- Projects 3D points/boxes to 2D image space
- Handles coordinate transformations
- Manages global to BEV conversions

## WebSocket Managers

### TrackingWebSocketManager
- Manages multiple WebSocket connections per camera
- Broadcasts track data to connected clients
- Handles frame requests and keep-alive signals

### StreamWebSocketManager
- Streams video frames with overlaid bounding boxes
- Handles video capture and frame encoding
- Manages real-time streaming to clients

## REST Endpoints

- `GET /` - Root endpoint with API info
- `GET /api/health` - Health check
- `GET /api/tracks/info` - Track file information
- `GET /api/calibration/info` - Calibration information
- `GET /api/videos/list` - Available videos

## WebSocket Endpoints

- `ws://localhost:8000/ws/tracks/{camera_id}` - Track data streaming
- `ws://localhost:8000/ws/stream/{camera_id}` - Video streaming with boxes

## Running

```bash
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
