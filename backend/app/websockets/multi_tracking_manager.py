from fastapi import WebSocket
from typing import Dict, List
import numpy as np
from app.services import ProjectionService

class MultiCameraTrackingWebSocketManager:
    def __init__(self, tracking_service, calibration_service):
        self.tracking_service = tracking_service
        self.calibration_service = calibration_service
        self.active_connections: List[WebSocket] = []
        self.frame_cache: Dict[int, Dict] = {}  # cache cho toàn bộ multi-camera data
        self.max_cache_size = 50

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[MultiCam] Client connected | Total: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"[MultiCam] Client disconnected | Remaining: {len(self.active_connections)}")

    async def broadcast_multi_camera_frame(self, frame_id: int):
        if frame_id in self.frame_cache:
            data = self.frame_cache[frame_id]
            print(f"[MultiCam] Using cache for frame {frame_id}")
        else:
            data = await self._build_multi_camera_data(frame_id)
            self.frame_cache[frame_id] = data

            # Cache eviction
            if len(self.frame_cache) > self.max_cache_size:
                oldest = min(self.frame_cache.keys())
                del self.frame_cache[oldest]

        # Gửi đến tất cả client đang kết nối
        if self.active_connections:
            disconnected = []
            for ws in self.active_connections[:]:
                try:
                    await ws.send_json(data)
                except:
                    disconnected.append(ws)
            for ws in disconnected:
                await self.disconnect(ws)

    async def _build_multi_camera_data(self, frame_id: int) -> Dict:
        tracks = self.tracking_service.get_frame_tracks(frame_id)
        all_cams = self.calibration_service.get_all_camera_params()
        
        cameras_data = {}
        
        for cam_id, cam_params in all_cams.items():
            bboxes = []
            if not cam_params:
                continue
                
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
                            "yaw_arrow": result["yaw_arrow"],
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

        return {
            "frame_id": frame_id,
            "timestamp": frame_id,
            "total_cameras": len(cameras_data),
            "cameras": cameras_data
        }