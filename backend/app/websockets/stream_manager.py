from fastapi import WebSocket

from typing import Dict, List
import asyncio
import cv2
import numpy as np
from pathlib import Path
from app.services import ProjectionService


class StreamWebSocketManager:
    """Manages WebSocket connections for video streaming"""
    
    def __init__(self, tracking_service, calibration_service, video_dir: str):
        self.tracking_service = tracking_service
        self.calibration_service = calibration_service
        self.video_dir = Path(video_dir)
    async def stream_video(self, websocket: WebSocket, camera_id: int):
        """Stream video with overlaid bounding boxes"""
        await websocket.accept()
        
        try:
            # Get video file for this camera
            video_path = self.video_dir / f"Camera_{camera_id}.mp4"
            if not video_path.exists():
                await websocket.send_json({"error": f"Video not found for camera {camera_id}"})
                await websocket.close()
                return
            
            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                await websocket.send_json({"error": f"Failed to open video for camera {camera_id}"})
                await websocket.close()
                return
            
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_delay = 1.0 / fps if fps > 0 else 0.033
            
            camera_params = self.calibration_service.get_camera_params(camera_id)
            if not camera_params:
                print(f"Warning: No calibration found for camera {camera_id}")
            
            frame_id = 0
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Get tracks for this frame
                tracks = self.tracking_service.get_frame_tracks(frame_id)
                
                # Draw bounding boxes if we have calibration
                if camera_params and tracks:
                    for track in tracks:
                        bbox_2d = ProjectionService.project_3d_to_2d(
                            np.array(track['center_3d']),
                            np.array(track['dimension']),
                            track['yaw'],
                            camera_params
                        )
                        
                        if bbox_2d:
                            x1, y1, x2, y2 = bbox_2d
                            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                            cv2.putText(frame, f"ID: {track['object_id']}", (x1, y1 - 10),
                                      cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
                
                # Encode frame to JPEG
                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                frame_bytes = buffer.tobytes()
                
                # Send frame data
                await websocket.send_bytes(frame_bytes)
                
                frame_id += 1
                await asyncio.sleep(frame_delay)
            
            cap.release()
        
        except Exception as e:
            print(f"Stream error for camera {camera_id}: {e}")
        
        finally:
            try:
                await websocket.close()
            except:
                pass
