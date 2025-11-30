"""WebSocket handlers for the application."""
from fastapi import WebSocket, WebSocketDisconnect

from app.dependencies import (
    get_tracking_ws_manager,
    get_stream_ws_manager,
    get_multi_camera_ws_manager,
)
from app.websockets import TrackingWebSocketManager, StreamWebSocketManager
from app.websockets.multi_tracking_manager import MultiCameraTrackingWebSocketManager


async def handle_multi_camera_tracks(websocket: WebSocket):
    """WebSocket handler for streaming multi-camera tracking data."""
    tracking_ws_manager = get_multi_camera_ws_manager()
    print("[MultiCam] Connection attempt to /ws/tracks/all")
    
    try:
        await tracking_ws_manager.connect(websocket)
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
                await tracking_ws_manager.broadcast_multi_camera_frame(frame_id)
                
    except WebSocketDisconnect:
        print("[MultiCam] Client disconnected normally")
        await tracking_ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"[MultiCam] WebSocket error: {e}")
        import traceback
        traceback.print_exc()
        await tracking_ws_manager.disconnect(websocket)


async def handle_single_camera_tracks(websocket: WebSocket, camera_id: int):
    """WebSocket handler for streaming single camera frame tracks."""
    tracking_ws_manager = get_tracking_ws_manager()
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


async def handle_video_stream(websocket: WebSocket, camera_id: int):
    """WebSocket handler for streaming video frames with overlaid bounding boxes."""
    stream_ws_manager = get_stream_ws_manager()
    await stream_ws_manager.stream_video(websocket, camera_id)

