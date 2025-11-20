from fastapi import APIRouter

router = APIRouter(prefix="", tags=["Root"])


@router.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "POSE Backend API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "tracks_info": "/api/tracks/info",
            "calibration_info": "/api/calibration/info",
            "videos_list": "/api/videos/list",
            "websockets": {
                "tracks": "ws://localhost:8000/ws/tracks/{camera_id}",
                "stream": "ws://localhost:8000/ws/stream/{camera_id}"
            }
        }
    }
