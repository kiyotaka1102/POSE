from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from app.services import TrackingService, CalibrationService
from app.websockets import TrackingWebSocketManager, StreamWebSocketManager
from app.routes import root_router, info_router
from app.websockets.multi_tracking_manager import MultiCameraTrackingWebSocketManager

# Initialize FastAPI app
app = FastAPI(title="POSE Backend", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get base directory and file paths
BASE_DIR = Path(__file__).resolve().parent.parent
VIDEO_DIR = BASE_DIR / "data" / "Warehouse_017" / "videos"
TRACK_FILE = BASE_DIR / "data" / "Warehouse_017" / "track1_class.txt"
CALIB_FILE = BASE_DIR / "data" / "Warehouse_017" / "calibration.json"

# Initialize services
tracking_service = TrackingService(str(TRACK_FILE), expected_scene_id=17)
calibration_service = CalibrationService(str(CALIB_FILE))

# Initialize WebSocket managers
tracking_ws_manager = TrackingWebSocketManager(tracking_service, calibration_service)
stream_ws_manager = StreamWebSocketManager(tracking_service, calibration_service, str(VIDEO_DIR))
multi_camera_ws_manager = MultiCameraTrackingWebSocketManager(tracking_service, calibration_service)

# Mount static files for videos
if VIDEO_DIR.exists():
    app.mount("/api/videos", StaticFiles(directory=VIDEO_DIR), name="videos")

# Register routes
app.include_router(root_router)
app.include_router(info_router)

# ============= Debug Endpoints =============

@app.get("/api/debug/tracking-info")
async def debug_tracking_info():
    """Debug endpoint to check if tracking data is loaded"""
    info = tracking_service.get_info()
    min_frame, max_frame = tracking_service.get_frame_range()
    sample_frame = None
    
    if min_frame is not None:
        sample_frame = tracking_service.get_frame_tracks(min_frame)
    
    return {
        "tracking": info,
        "frame_range": {"min": min_frame, "max": max_frame},
        "sample_frame": sample_frame[:2] if sample_frame else None
    }

@app.get("/api/debug/calibration-info")
async def debug_calibration_info():
    """Debug endpoint to check if calibration data is loaded"""
    return calibration_service.get_info()

# ============= WebSocket Endpoints =============
@app.websocket("/ws/tracks/all")
async def websocket_multi_camera_tracks(websocket: WebSocket):
    """WebSocket endpoint for streaming multi-camera tracking data"""
    print("[MultiCam] Connection attempt to /ws/tracks/all")
    
    try:
        await multi_camera_ws_manager.connect(websocket)
        print("[MultiCam] Client successfully connected")
        
        while True:
            data = await websocket.receive_json()
            print(f"[MultiCam] Received data: {data}")
            
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                continue
                
            if "frame_id" in data:
                frame_id = int(data["frame_id"])
                print(f"[MultiCam] Request frame {frame_id} from client")
                await multi_camera_ws_manager.broadcast_multi_camera_frame(frame_id)
                
    except WebSocketDisconnect:
        print("[MultiCam] Client disconnected normally")
        await multi_camera_ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"[MultiCam] WebSocket error: {e}")
        import traceback
        traceback.print_exc()
        await multi_camera_ws_manager.disconnect(websocket)


@app.websocket("/ws/tracks/{camera_id}")
async def websocket_tracks(websocket: WebSocket, camera_id: int):
    """WebSocket endpoint for streaming single camera frame tracks"""
    await tracking_ws_manager.connect(websocket, camera_id)
    print(f"[DEBUG] WebSocket handler started for camera {camera_id}")
    try:
        while True:
            try:
                data = await websocket.receive_json()
                print(f"[DEBUG] Received data from client: {data}")
                
                # Client sends frame_id to request tracking data
                if "frame_id" in data:
                    frame_id = data["frame_id"]
                    print(f"[DEBUG] Processing frame_id request: {frame_id} for camera {camera_id}")
                    await tracking_ws_manager.broadcast_frame_tracks(frame_id, camera_id)
                    print(f"[DEBUG] Frame {frame_id} broadcasted successfully")
                
                # Handle ping/keep-alive
                elif data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except Exception as inner_e:
                print(f"[DEBUG] Error processing message: {inner_e}")
                raise
    
    except WebSocketDisconnect:
        await tracking_ws_manager.disconnect(websocket, camera_id)
        print(f"[DEBUG] Client disconnected from camera {camera_id}")
    except Exception as e:
        print(f"[DEBUG] WebSocket error for camera {camera_id}: {e}")
        import traceback
        traceback.print_exc()
        await tracking_ws_manager.disconnect(websocket, camera_id)


@app.websocket("/ws/stream/{camera_id}")
async def websocket_stream(websocket: WebSocket, camera_id: int):
    """WebSocket endpoint for streaming video frames with overlaid bounding boxes"""
    await stream_ws_manager.stream_video(websocket, camera_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)