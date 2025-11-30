"""WebSocket routes."""
from fastapi import APIRouter, WebSocket

from app.websockets.handlers import (
    handle_multi_camera_tracks,
    handle_single_camera_tracks,
    handle_video_stream,
)

router = APIRouter()


@router.websocket("/ws/tracks/all")
async def websocket_multi_camera_tracks(websocket: WebSocket):
    """WebSocket endpoint for streaming multi-camera tracking data."""
    await handle_multi_camera_tracks(websocket)


@router.websocket("/ws/tracks/{camera_id}")
async def websocket_tracks(websocket: WebSocket, camera_id: int):
    """WebSocket endpoint for streaming single camera frame tracks."""
    await handle_single_camera_tracks(websocket, camera_id)


@router.websocket("/ws/stream/{camera_id}")
async def websocket_stream(websocket: WebSocket, camera_id: int):
    """WebSocket endpoint for streaming video frames with overlaid bounding boxes."""
    await handle_video_stream(websocket, camera_id)

