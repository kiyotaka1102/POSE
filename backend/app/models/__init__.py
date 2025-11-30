from pydantic import BaseModel
from typing import List, Optional
import numpy as np


class BBox2D(BaseModel):
    """2D Bounding Box"""
    x1: int
    y1: int
    x2: int
    y2: int


class Track(BaseModel):
    """3D Track object"""
    object_id: int
    center_3d: List[float]  # [x, y, z]
    yaw: float
    dimension: List[float]  # [width, length, height]
    class_id: int


class FrameTrackData(BaseModel):
    """Track data for a specific frame"""
    frame_id: int
    camera_id: int
    timestamp: float
    bboxes: List[dict]


class CameraCalibration(BaseModel):
    """Camera calibration parameters"""
    camera_id: int
    K: List[List[float]]  # Intrinsic matrix
    E: List[List[float]]  # Extrinsic matrix
    P: List[List[float]]  # Projection matrix


class TrackFileInfo(BaseModel):
    """Track file information"""
    total_frames: int
    min_frame: Optional[int] = None
    max_frame: Optional[int] = None
    total_tracks: int


class CalibrationInfo(BaseModel):
    """Calibration file information"""
    cameras: List[int]
    total_cameras: int


# Authentication Schemas
class LoginRequest(BaseModel):
    """Login request model"""
    emailAddress: str
    password: str


class UserResponse(BaseModel):
    """User response model"""
    id: int
    fullName: str
    emailAddress: str
    role: str
    address: Optional[str] = None
    dateOfBirth: Optional[str] = None
    gender: Optional[str] = None


class LoginResponse(BaseModel):
    """Login response model"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
