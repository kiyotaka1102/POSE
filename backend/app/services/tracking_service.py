import os
import json
from pathlib import Path
from collections import defaultdict
import numpy as np
from typing import Dict, List, Optional


class TrackingService:
    """Service for loading and managing tracking data"""
    
    def __init__(self, track_file: str, expected_scene_id: int = 19):
        self.track_file = track_file
        self.expected_scene_id = expected_scene_id
        self.tracks = self._load_tracks()
    
    def _load_tracks(self) -> Dict:
        """Load tracking data from track1.txt"""
        tracks = defaultdict(list)
        
        if not os.path.exists(self.track_file):
            print(f"Warning: Track file not found: {self.track_file}")
            return tracks
        
        with open(self.track_file, 'r') as f:
            for line in f:
                if not line.strip() or line.startswith('#'):
                    continue
                
                parts = line.strip().split()
                if len(parts) != 11:
                    continue
                
                try:
                    scene_id, class_id, object_id, frame_id, x, y, z, width, length, height, yaw = map(float, parts)
                    
                    if scene_id != self.expected_scene_id:
                        continue
                    
                    if not all(np.isfinite([x, y, z, width, length, height, yaw])):
                        continue
                    
                    if width <= 0 or length <= 0 or height <= 0:
                        continue
                    
                    object_id = int(object_id)
                    frame_id = int(frame_id)
                    class_id = int(class_id)
                    
                    center_3d = np.array([x, y, z])
                    dimension = np.array([width, length, height])
                    
                    tracks[frame_id].append({
                        'object_id': object_id,
                        'center_3d': center_3d.tolist(),
                        'yaw': float(yaw),
                        'dimension': dimension.tolist(),
                        'class_id': class_id
                    })
                
                except (ValueError, IndexError):
                    continue
        
        return tracks
    
    def get_frame_tracks(self, frame_id: int) -> List[dict]:
        """Get tracks for a specific frame"""
        return self.tracks.get(frame_id, [])
    
    def get_frame_range(self):
        """Get min and max frame IDs"""
        if not self.tracks:
            return None, None
        frame_ids = list(self.tracks.keys())
        return min(frame_ids), max(frame_ids)
    
    def get_info(self) -> dict:
        """Get information about tracks"""
        if not self.tracks:
            return {'total_frames': 0}
        
        frame_ids = sorted(self.tracks.keys())
        return {
            'total_frames': len(frame_ids),
            'min_frame': min(frame_ids),
            'max_frame': max(frame_ids),
            'total_tracks': sum(len(t) for t in self.tracks.values())
        }
