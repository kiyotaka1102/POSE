import numpy as np
from typing import Optional, List


class ProjectionService:
    """Service for 3D to 2D projection operations"""
    
    @staticmethod
    def project_3d_to_2d(
        center_3d: np.ndarray,
        dimension: np.ndarray,
        yaw: float,
        camera_params: dict
    ) -> Optional[List[List[float]]]:
        try:
            w, l, h = dimension
            
            # 1. Define 8 corners in object local frame
            corners_3d_local = np.array([
                [w/2, l/2, -h/2], [w/2, -l/2, -h/2], [-w/2, -l/2, -h/2], [-w/2, l/2, -h/2],
                [w/2, l/2, h/2],  [w/2, -l/2, h/2],  [-w/2, -l/2, h/2],  [-w/2, l/2, h/2]
            ])

            # 2. Apply yaw rotation (around Z)
            R_yaw = np.array([
                [np.cos(yaw), -np.sin(yaw), 0],
                [np.sin(yaw), np.cos(yaw), 0],
                [0, 0, 1]
            ])
            corners_3d_local = (R_yaw @ corners_3d_local.T).T

            # 3. Translate to global position
            corners_3d_global = corners_3d_local + center_3d

            E = np.array(camera_params['E'])  
            if E.shape == (4, 4):
                corners_hom = np.hstack([corners_3d_global, np.ones((8, 1))])
                corners_cam = (E @ corners_hom.T).T
                corners_cam = corners_cam[:, :3] / corners_cam[:, 3:4]  # normalize
            else:
                corners_cam = corners_3d_global

            P = np.array(camera_params['P'])
            corners_2d_hom = (P @ np.hstack([corners_cam, np.ones((8, 1))]).T).T
            z = corners_2d_hom[:, 2]

            if np.any(z <= 0):
                return None

            corners_2d = corners_2d_hom[:, :2] / z.reshape(-1, 1)

            return [[float(x), float(y)] for x, y in corners_2d]

        except Exception as e:
            print(f"Error projecting 3D to 2D: {e}")
            return None

    @staticmethod
    def global_to_bev(
        gx: float,
        gy: float,
        x_origin: float,
        y_origin: float,
        scale: float
    ) -> tuple:
        """Convert global coordinates to BEV map coordinates"""
        x_map = int((gx + x_origin) * scale)
        y_map = int((y_origin - gy) * scale)
        return x_map, y_map
