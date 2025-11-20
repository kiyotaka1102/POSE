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
    def project_3d_to_2d_with_yaw_arrow(
        center_3d: np.ndarray,
        dimension: np.ndarray,
        yaw: float,
        camera_params: dict
    ) -> Optional[dict]:
        """
        Trả về:
        - corners_2d: List[List[float]] (8 điểm)
        - yaw_arrow: dict với start_2d và end_2d (hoặc None nếu bị che)
        """
        try:
            w, l, h = dimension

            # 1. Tạo 8 góc hộp 3D (giống cũ)
            corners_3d_local = np.array([
                [w/2, l/2, -h/2], [w/2, -l/2, -h/2], [-w/2, -l/2, -h/2], [-w/2, l/2, -h/2],
                [w/2, l/2, h/2],  [w/2, -l/2, h/2],  [-w/2, -l/2, h/2],  [-w/2, l/2, h/2]
            ])

            # 2. Xoay yaw
            R_yaw = np.array([
                [np.cos(yaw), -np.sin(yaw), 0],
                [np.sin(yaw), np.cos(yaw), 0],
                [0, 0, 1]
            ])
            corners_3d_local = (R_yaw @ corners_3d_local.T).T
            corners_3d_global = corners_3d_local + center_3d

            # 3. Tính bottom center (giống code gốc)
            bottom_corners = corners_3d_global[[4,5,6,7]]  # z cao hơn là đáy xe (tùy convention)
            bottom_center_3d = np.mean(bottom_corners, axis=0, keepdims=True)  # (1, 3)

            # 4. Vector hướng về phía trước: trong local frame là [0, -1, 0] hoặc [0, 1, 0] tùy convention
            # Quan trọng: Phải cùng convention với training data!
            forward_local = np.array([[0, -1.0, 0]], dtype=np.float32)  # phổ biến trong KITTI, nuScenes
            forward_world = (R_yaw @ forward_local.T).T  # (1, 3)
            arrow_length = 2.0  # mét, có thể điều chỉnh
            arrow_tip_3d = bottom_center_3d + arrow_length * forward_world

            # 5. Chiếu toàn bộ điểm xuống 2D
            E = np.array(camera_params['E'])
            P = np.array(camera_params['P'])

            def project_points(points_3d: np.ndarray) -> np.ndarray:
                pts_hom = np.hstack([points_3d, np.ones((len(points_3d), 1))])
                if E.shape == (4, 4):
                    pts_cam = (E @ pts_hom.T).T
                    pts_cam = pts_cam[:, :3] / pts_cam[:, [3]]
                else:
                    pts_cam = points_3d
                pts_2d_hom = (P @ np.hstack([pts_cam, np.ones((len(pts_cam), 1))]).T).T
                z = pts_2d_hom[:, 2]
                if np.any(z <= 0.1):  # quá gần hoặc sau camera
                    return None
                pts_2d = pts_2d_hom[:, :2] / pts_2d_hom[:, 2:3]
                return pts_2d

            corners_2d = project_points(corners_3d_global)
            arrow_pts_3d = np.vstack([bottom_center_3d, arrow_tip_3d])  # (2, 3)
            arrow_2d = project_points(arrow_pts_3d)

            if corners_2d is None or arrow_2d is None:
                return None

            corners_2d_list = [[float(x), float(y)] for x, y in corners_2d]
            arrow_start = [float(arrow_2d[0, 0]), float(arrow_2d[0, 1])]
            arrow_end   = [float(arrow_2d[1, 0]), float(arrow_2d[1, 1])]

            return {
                "corners_2d": corners_2d_list,
                "yaw_arrow": {
                    "start_2d": arrow_start,
                    "end_2d": arrow_end
                }
            }

        except Exception as e:
            print(f"Error in project_3d_to_2d_with_yaw_arrow: {e}")
            import traceback
            traceback.print_exc()
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
