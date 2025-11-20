from fastapi import WebSocket
from typing import List, Dict
import asyncio
import numpy as np
from app.services import ProjectionService


class TrackingWebSocketManager:
    """Manages WebSocket connections for tracking data"""
    
    def __init__(self, tracking_service, calibration_service):
        self.tracking_service = tracking_service
        self.calibration_service = calibration_service
        self.active_connections: Dict[int, List[WebSocket]] = {} 
        self.frame_cache: Dict[int, Dict] = {} 
        self.max_cache_size = 100  
    
    async def connect(self, websocket: WebSocket, camera_id: int):
        """Register a new WebSocket connection"""
        await websocket.accept()
        if camera_id not in self.active_connections:
            self.active_connections[camera_id] = []
        self.active_connections[camera_id].append(websocket)
        print(f"Client connected to tracks for camera {camera_id}")
    
    async def disconnect(self, websocket: WebSocket, camera_id: int):
        """Remove a WebSocket connection"""
        if camera_id in self.active_connections:
            self.active_connections[camera_id].remove(websocket)
            print(f"Client disconnected from tracks for camera {camera_id}")
    
    async def broadcast_frame_tracks(self, frame_id: int, camera_id: int):
        """Broadcast tracks for a specific frame and camera to all connected clients"""
        print(f"[DEBUG] broadcast_frame_tracks called: frame_id={frame_id}, camera_id={camera_id}")
        
        # Check cache first
        if frame_id in self.frame_cache:
            frame_data = self.frame_cache[frame_id]
            print(f"[DEBUG] Using cached data for frame {frame_id}")
        else:
            # Process and cache the frame
            tracks = self.tracking_service.get_frame_tracks(frame_id)
            print(f"[DEBUG] Retrieved {len(tracks)} tracks for frame {frame_id}")
            
            camera_params = self.calibration_service.get_camera_params(camera_id)
            print(f"[DEBUG] Camera params available: {camera_params is not None}")
            
            if not camera_params:
                print(f"[WARNING] Camera params not found for camera {camera_id}, sending raw data")
            
            frame_data = {
                "frame_id": frame_id,
                "camera_id": camera_id,
                "timestamp": frame_id,
                "bboxes": []
            }
            
            # If we have camera params, project 3D to 2D
            if camera_params:
                for track in tracks:
                    try:
                        corners_2d = ProjectionService.project_3d_to_2d(
                            np.array(track['center_3d']),
                            np.array(track['dimension']),
                            track['yaw'],
                            camera_params
                        )
                        
                        if corners_2d:
                            frame_data["bboxes"].append({
                                "object_id": track['object_id'],
                                "class_id": track['class_id'],
                                "corners_2d": corners_2d,
                                "center_3d": track['center_3d'],
                                "dimension": track['dimension'],
                                "yaw": track['yaw']
                            })
                    except Exception as e:
                        print(f"[DEBUG] Error processing track {track.get('object_id')}: {e}")
                        import traceback
                        traceback.print_exc()
                        continue
            else:
                # No camera params - send raw 3D data without 2D projection
                for track in tracks:
                    frame_data["bboxes"].append({
                        "object_id": track['object_id'],
                        "class_id": track['class_id'],
                        "corners_2d": [[0, 0] for _ in range(8)], 
                        "center_3d": track['center_3d'],
                        "dimension": track['dimension'],
                        "yaw": track['yaw']
                    })
            
            # Cache the frame data
            self.frame_cache[frame_id] = frame_data
            
            # Simple cache eviction - keep only recent frames
            if len(self.frame_cache) > self.max_cache_size:
                oldest_frame = min(self.frame_cache.keys())
                del self.frame_cache[oldest_frame]
            
            # Log for debugging
            print(f"[DEBUG] Frame {frame_id} processed: {len(frame_data['bboxes'])} bboxes")
        
        # Broadcast to all connected clients for this camera
        if camera_id in self.active_connections:
            print(f"[DEBUG] Broadcasting to {len(self.active_connections[camera_id])} clients for camera {camera_id}")
            disconnected = []
            for connection in self.active_connections[camera_id]:
                try:
                    await connection.send_json(frame_data)
                    print(f"[DEBUG] Successfully sent frame data to client")
                except Exception as e:
                    print(f"[DEBUG] Error broadcasting to client: {e}")
                    disconnected.append(connection)
            
            # Remove disconnected clients
            for connection in disconnected:
                await self.disconnect(connection, camera_id)
        else:
            print(f"[DEBUG] No active connections for camera {camera_id}")
