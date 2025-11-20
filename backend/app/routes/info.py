from fastapi import APIRouter, Depends
from pathlib import Path
from app.services import TrackingService, CalibrationService

router = APIRouter(prefix="/api", tags=["Info"])


@router.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok"}


@router.get("/videos/list")
async def list_videos():
    """List all available videos"""
    from app.main import VIDEO_DIR
    try:
        if not VIDEO_DIR.exists():
            return {"videos": [], "count": 0, "error": f"Video directory not found: {VIDEO_DIR}"}
        
        videos = sorted([
            f.name for f in VIDEO_DIR.iterdir() 
            if f.suffix.lower() in ['.mp4', '.avi', '.mov', '.mkv']
        ])
        return {"videos": videos, "count": len(videos)}
    except Exception as e:
        return {"error": str(e), "videos": [], "count": 0}


@router.get("/tracks/info")
async def get_tracks_info():
    """Get track file information"""
    from app.main import tracking_service
    try:
        info = tracking_service.get_info()
        return info
    except Exception as e:
        return {"error": str(e)}


@router.get("/calibration/info")
async def get_calibration_info():
    """Get calibration information"""
    from app.main import calibration_service
    try:
        info = calibration_service.get_info()
        return info
    except Exception as e:
        return {"error": str(e)}
