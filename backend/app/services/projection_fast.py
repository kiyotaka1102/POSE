# app/services/projection_fast.py
import numpy as np
from typing import Dict, List, Optional, Tuple

class ProjectionServiceFast:
    """Very fast vectorised version – ~10× faster than the original"""

    @staticmethod
    def _homogeneous(pts: np.ndarray) -> np.ndarray:
        """(N,3) → (N,4) homogeneous"""
        return np.concatenate([pts, np.ones((pts.shape[0], 1))], axis=1)

    @staticmethod
    def _rotation_y(yaw: float) -> np.ndarray:
        c, s = np.cos(yaw), np.sin(yaw)
        return np.array([[c, -s, 0.],
                         [s,  c, 0.],
                         [0., 0., 1.]])

    @staticmethod
    def project_frame_batch(
        centers_3d: np.ndarray,          # (N,3)
        dimensions: np.ndarray,          # (N,3)  [w,l,h]
        yaws: np.ndarray,                # (N,)
        cam_params: Dict
    ) -> Tuple[List[Optional[List[List[float]]]],
               List[Optional[Dict]]]:
        """
        Returns two parallel lists (length N):
            corners_2d_list   – 8 corners or None if behind camera
            yaw_arrow_dict    – {"start_2d":..., "end_2d":...} or None
        """
        N = len(centers_3d)
        E = np.asarray(cam_params['E'])      # (4,4) or (3,3) identity
        P = np.asarray(cam_params['P'])      # (3,4)

        # ---- 8 corners in local frame (fixed for every car) ----
        w, l, h = dimensions.T                # (N,),(N,),(N,)
        half = np.stack([w/2, l/2, h/2], axis=1)   # (N,3)

        # 8 corners offsets (same order as original code)
        offsets = np.array([
            [ 1,  1, -1], [ 1, -1, -1], [-1, -1, -1], [-1,  1, -1],
            [ 1,  1,  1], [ 1, -1,  1], [-1, -1,  1], [-1,  1,  1]
        ], dtype=np.float32)                   # (8,3)

        corners_local = offsets[None, :, :] * half[:, None, :]   # (N,8,3)

        # ---- Apply per-object yaw rotation (vectorised) ----
        Rs = np.stack([ProjectionServiceFast._rotation_y(y) for y in yaws])   # (N,3,3)
        corners_rot = np.einsum('nij,nkj->nki', Rs, corners_local)            # (N,8,3)

        # ---- Translate to world ----
        corners_world = corners_rot + centers_3d[:, None, :]                 # (N,8,3)

        # ---- Project to camera & image plane (single matrix op) ----
        pts_h = ProjectionServiceFast._homogeneous(corners_world.reshape(-1, 3))  # (N*8,4)

        if E.shape == (4, 4):
            pts_cam = (E @ pts_h.T).T
            pts_cam = pts_cam[:, :3] / pts_cam[:, 3:4]
        else:
            pts_cam = pts_h[:, :3]

        pts_img_h = (P @ ProjectionServiceFast._homogeneous(pts_cam).T).T          # (N*8,3)
        z = pts_img_h[:, 2]
        valid = z > 0.1

        pts_2d = pts_img_h[:, :2] / pts_img_h[:, 2:3]
        pts_2d[~valid] = np.nan   # mark invalid points

        corners_2d = pts_2d.reshape(N, 8, 2)

        # ---- Yaw arrow (bottom center → forward) ----
        # bottom center = average of the 4 top corners (index 4-7)
        bottom_center = np.mean(corners_world[:, 4:8, :], axis=1)               # (N,3)

        forward_local = np.array([0., -1., 0.], dtype=np.float32)
        forward_world = np.einsum('nij,j->ni', Rs, forward_local)              # (N,3)
        arrow_len = 2.0
        arrow_tip = bottom_center + arrow_len * forward_world

        # project arrow (2 points per object)
        arrow_pts = np.stack([bottom_center, arrow_tip], axis=1).reshape(-1, 3)   # (2N,3)
        arrow_h = ProjectionServiceFast._homogeneous(arrow_pts)
        if E.shape == (4, 4):
            arrow_cam = (E @ arrow_h.T).T
            arrow_cam = arrow_cam[:, :3] / arrow_cam[:, 3:4]
        else:
            arrow_cam = arrow_pts

        arrow_img_h = (P @ ProjectionServiceFast._homogeneous(arrow_cam).T).T
        arrow_z = arrow_img_h[:, 2]
        arrow_valid = arrow_z > 0.1
        arrow_2d = arrow_img_h[:, :2] / arrow_img_h[:, 2:3]
        arrow_2d[~arrow_valid] = np.nan

        arrow_start = arrow_2d[0::2]   # even indices
        arrow_end   = arrow_2d[1::2]

        # ---- Convert to python lists (only valid objects) ----
        corners_out = []
        arrow_out   = []

        for i in range(N):
            if not np.all(np.isfinite(corners_2d[i])):      # at least one corner behind
                corners_out.append(None)
                arrow_out.append(None)
                continue

            corners_out.append(corners_2d[i].tolist())
            arrow_out.append({
                "start_2d": arrow_start[i].tolist(),
                "end_2d":   arrow_end[i].tolist()
            })

        return corners_out, arrow_out