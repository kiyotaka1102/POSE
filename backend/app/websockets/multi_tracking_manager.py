from fastapi import WebSocket
from typing import Dict, List
import numpy as np
from app.services import ProjectionService


class MultiCameraTrackingWebSocketManager:
    def __init__(self, tracking_service, calibration_service):
        self.tracking_service = tracking_service
        self.calibration_service = calibration_service
        self.active_connections: List[WebSocket] = []
        self.frame_cache: Dict[int, Dict] = {}
        self.max_cache_size = 50

    async def connect(self, websocket: WebSocket):
        """Accept WebSocket connection"""
        try:
            await websocket.accept()
            self.active_connections.append(websocket)
            print(f"[MultiCam] Client connected | Total: {len(self.active_connections)}")
        except Exception as e:
            print(f"[MultiCam] Error accepting connection: {e}")
            raise

    async def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"[MultiCam] Client disconnected | Remaining: {len(self.active_connections)}")

    async def broadcast_multi_camera_frame(self, frame_id: int):
        """Broadcast multi-camera tracking data for a specific frame"""
        print(f"[MultiCam] Broadcasting frame {frame_id}")
        
        # Check cache first
        if frame_id in self.frame_cache:
            data = self.frame_cache[frame_id]
            print(f"[MultiCam] Using cache for frame {frame_id}")
        else:
            # Build new data
            data = await self._build_multi_camera_data(frame_id)
            self.frame_cache[frame_id] = data
            print(f"[MultiCam] Built new data for frame {frame_id}: {data.get('total_cameras')} cameras, {sum(len(cam['bboxes']) for cam in data.get('cameras', {}).values())} total bboxes")

            # Cache eviction - keep only recent frames
            if len(self.frame_cache) > self.max_cache_size:
                oldest = min(self.frame_cache.keys())
                del self.frame_cache[oldest]
                print(f"[MultiCam] Evicted frame {oldest} from cache")

        # Broadcast to all connected clients
        if self.active_connections:
            print(f"[MultiCam] Sending to {len(self.active_connections)} clients")
            disconnected = []
            for ws in self.active_connections[:]:  # Create copy to avoid modification during iteration
                try:
                    await ws.send_json(data)
                except Exception as e:
                    print(f"[MultiCam] Error sending to client: {e}")
                    disconnected.append(ws)
            
            # Remove disconnected clients
            for ws in disconnected:
                await self.disconnect(ws)
        else:
            print("[MultiCam] No active connections to broadcast to")

    async def _build_multi_camera_data(self, frame_id: int) -> Dict:
        """Build tracking data for all cameras for a specific frame"""
        # Get all tracks for this frame
        tracks = self.tracking_service.get_frame_tracks(frame_id)
        print(f"[MultiCam] Building data for frame {frame_id}: {len(tracks)} tracks")
        
        # Get all camera parameters
        all_cams = self.calibration_service.get_all_camera_params()
        print(f"[MultiCam] Available cameras: {list(all_cams.keys())}")
        
        cameras_data = {}
        
        # Process each camera
        for cam_id, cam_params in all_cams.items():
            if not cam_params:
                print(f"[MultiCam] Warning: No params for camera {cam_id}")
                continue
            
            bboxes = []
            
            # Project each track to this camera's view
            for track in tracks:
                try:
                    result = ProjectionService.project_3d_to_2d_with_yaw_arrow(
                        np.array(track['center_3d']),
                        np.array(track['dimension']),
                        track['yaw'],
                        cam_params
                    )
                    
                    if result:
                        bboxes.append({
                            "object_id": track['object_id'],
                            "class_id": track['class_id'],
                            "corners_2d": result["corners_2d"],
                            "yaw_arrow": result.get("yaw_arrow"),
                            "center_3d": track['center_3d'],
                            "dimension": track['dimension'],
                            "yaw": track['yaw']
                        })
                except Exception as e:
                    print(f"[MultiCam] Projection error cam {cam_id}, obj {track.get('object_id')}: {e}")
                    continue
            
            cameras_data[str(cam_id)] = {
                "camera_id": cam_id,
                "bboxes": bboxes
            }
            print(f"[MultiCam] Camera {cam_id}: {len(bboxes)} bboxes")

        return {
            "frame_id": frame_id,
            "timestamp": frame_id,
            "total_cameras": len(cameras_data),
            "cameras": cameras_data
        }