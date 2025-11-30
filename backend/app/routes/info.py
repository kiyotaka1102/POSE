"""Info routes for API endpoints."""
from fastapi import APIRouter, Depends
from pathlib import Path

from app.config import get_settings, Settings
from app.dependencies import get_tracking_service_dep, get_calibration_service_dep
from app.services import TrackingService, CalibrationService

router = APIRouter(prefix="/api", tags=["Info"])


@router.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok"}


@router.get("/videos/list")
async def list_videos(settings: Settings = Depends(get_settings)):
    """List all available videos"""
    try:
        video_dir = settings.video_dir
        if not video_dir.exists():
            return {
                "videos": [],
                "count": 0,
                "error": f"Video directory not found: {video_dir}"
            }
        
        videos = sorted([
            f.name for f in video_dir.iterdir() 
            if f.suffix.lower() in ['.mp4', '.avi', '.mov', '.mkv']
        ])
        return {"videos": videos, "count": len(videos)}
    except Exception as e:
        return {"error": str(e), "videos": [], "count": 0}


@router.get("/tracks/info")
async def get_tracks_info(
    tracking_service: TrackingService = Depends(get_tracking_service_dep)
):
    """Get track file information"""
    try:
        info = tracking_service.get_info()
        return info
    except Exception as e:
        return {"error": str(e)}


@router.get("/calibration/info")
async def get_calibration_info(
    calibration_service: CalibrationService = Depends(get_calibration_service_dep)
):
    """Get calibration information"""
    try:
        info = calibration_service.get_info()
        return info
    except Exception as e:
        return {"error": str(e)}


@router.get("/debug/tracking-info")
async def debug_tracking_info(
    tracking_service: TrackingService = Depends(get_tracking_service_dep)
):
    """Debug endpoint to check if tracking data is loaded"""
    info = tracking_service.get_info()
    min_frame, max_frame = tracking_service.get_frame_range()
    sample_frame = None
    
    if min_frame is not None:
        sample_frame = tracking_service.get_frame_tracks(min_frame)
    
    return {
        "tracking": info,
        "frame_range": {"min": min_frame, "max": max_frame},
        "sample_frame": sample_frame[:2] if sample_frame else None
    }


@router.get("/debug/calibration-info")
async def debug_calibration_info(
    calibration_service: CalibrationService = Depends(get_calibration_service_dep)
):
    """Debug endpoint to check if calibration data is loaded"""
    return calibration_service.get_info()
