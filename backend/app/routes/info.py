"""Info routes for API endpoints."""
from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import FileResponse, StreamingResponse
from pathlib import Path
import os

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


@router.get("/videos/{filename}")
async def serve_video(
    filename: str,
    request: Request,
    settings: Settings = Depends(get_settings)
):
    """Serve video files with proper CORS headers and range request support"""
    video_path = settings.video_dir / filename
    
    # Security check: prevent directory traversal
    try:
        video_path.resolve().relative_to(settings.video_dir.resolve())
    except ValueError:
        return Response(status_code=403, content="Forbidden")
    
    if not video_path.exists():
        return Response(status_code=404, content="Video not found")
    
    # Check if file is a video
    if video_path.suffix.lower() not in ['.mp4', '.avi', '.mov', '.mkv', '.webm']:
        return Response(status_code=400, content="Invalid file type")
    
    # Get file size
    file_size = video_path.stat().st_size
    
    # Handle range requests for video streaming
    range_header = request.headers.get('range')
    
    if range_header:
        # Parse range header
        range_match = range_header.replace('bytes=', '').split('-')
        start = int(range_match[0]) if range_match[0] else 0
        end = int(range_match[1]) if range_match[1] else file_size - 1
        
        # Ensure valid range
        if start >= file_size or end >= file_size:
            return Response(status_code=416, content="Range Not Satisfiable")
        
        # Calculate content length
        content_length = end - start + 1
        
        # Open file and seek to start position
        def iterfile():
            with open(video_path, 'rb') as f:
                f.seek(start)
                remaining = content_length
                while remaining:
                    chunk_size = min(8192, remaining)
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk
        
        # Return partial content response
        headers = {
            'Content-Range': f'bytes {start}-{end}/{file_size}',
            'Accept-Ranges': 'bytes',
            'Content-Length': str(content_length),
            'Content-Type': 'video/mp4',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Range',
            'Access-Control-Expose-Headers': 'Content-Range, Content-Length',
        }
        
        return StreamingResponse(
            iterfile(),
            status_code=206,
            headers=headers,
            media_type='video/mp4'
        )
    else:
        # Return full file
        return FileResponse(
            video_path,
            media_type='video/mp4',
            headers={
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                'Access-Control-Allow-Headers': 'Range',
                'Access-Control-Expose-Headers': 'Content-Range, Content-Length',
            }
        )


@router.head("/videos/{filename}")
async def head_video(
    filename: str,
    settings: Settings = Depends(get_settings)
):
    """Handle HEAD requests for video files"""
    video_path = settings.video_dir / filename
    
    # Security check: prevent directory traversal
    try:
        video_path.resolve().relative_to(settings.video_dir.resolve())
    except ValueError:
        return Response(status_code=403, content="Forbidden")
    
    if not video_path.exists():
        return Response(status_code=404, content="Video not found")
    
    file_size = video_path.stat().st_size
    
    headers = {
        'Content-Length': str(file_size),
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range',
        'Access-Control-Expose-Headers': 'Content-Range, Content-Length',
    }
    
    return Response(status_code=200, headers=headers)


@router.options("/videos/{filename}")
async def options_video():
    """Handle OPTIONS requests for CORS preflight"""
    return Response(
        status_code=200,
        headers={
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Range',
            'Access-Control-Max-Age': '3600',
        }
    )
