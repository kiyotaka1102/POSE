import os
import json
from pathlib import Path
import numpy as np
from typing import Dict, Tuple


class CalibrationService:
    """Service for loading and managing camera calibration"""
    
    def __init__(self, calib_file: str):
        self.calib_file = calib_file
        self.cameras, self.map_params = self._load_calibration()
    
    def _load_calibration(self) -> Tuple[Dict, Dict]:
        """Load camera calibration from JSON file"""
        cameras = {}
        map_params = {'x_origin': 0.0, 'y_origin': 0.0, 'scale': 1.0}
        
        if not os.path.exists(self.calib_file):
            print(f"Warning: Calibration file not found: {self.calib_file}")
            return cameras, map_params
        
        try:
            with open(self.calib_file, 'r') as f:
                calib_data = json.load(f)
            
            for sensor in calib_data.get('sensors', []):
                if sensor['type'] == 'camera':
                    cam_id = sensor['id']
                    
                    if cam_id == 'Camera':
                        cam_id = 0
                    elif cam_id.startswith('Camera_'):
                        cam_id = int(cam_id.replace('Camera_', ''))
                    else:
                        continue
                    
                    K = np.array(sensor['intrinsicMatrix'])
                    E = np.array(sensor['extrinsicMatrix'])
                    P = np.array(sensor['cameraMatrix'])
                    
                    cameras[cam_id] = {
                        'K': K.tolist(),
                        'E': E.tolist(),
                        'P': P.tolist()
                    }
        
        except Exception as e:
            print(f"Error loading calibration file: {e}")
        
        return cameras, map_params
    
    def get_camera_params(self, camera_id: int) -> Dict:
        """Get parameters for a specific camera"""
        return self.cameras.get(camera_id)
    
    def get_info(self) -> dict:
        """Get calibration information"""
        return {
            'cameras': list(self.cameras.keys()),
            'total_cameras': len(self.cameras)
        }
    def get_available_camera_ids(self) -> list[int]:
        """Trả về danh sách tất cả camera ID đã được load thành công"""
        return sorted(self.cameras.keys())

    def get_all_camera_params(self) -> Dict[int, Dict]:
        """Trả về dict {camera_id: params} cho tất cả camera"""
        return self.cameras.copy()
