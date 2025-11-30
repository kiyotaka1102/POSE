"""Root routes."""
from fastapi import APIRouter, Depends

from app.config import get_settings, Settings

router = APIRouter(prefix="", tags=["Root"])


@router.get("/")
async def root(settings: Settings = Depends(get_settings)):
    """Root endpoint"""
    return {
        "message": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "endpoints": {
            "health": "/api/health",
            "tracks_info": "/api/tracks/info",
            "calibration_info": "/api/calibration/info",
            "videos_list": "/api/videos/list",
            "websockets": {
                "tracks": f"ws://localhost:{settings.PORT}/ws/tracks/{{camera_id}}",
                "tracks_all": f"ws://localhost:{settings.PORT}/ws/tracks/all",
                "stream": f"ws://localhost:{settings.PORT}/ws/stream/{{camera_id}}"
            }
        }
    }
