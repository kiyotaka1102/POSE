"""Dependency injection for services and WebSocket managers."""
from typing import Optional

from fastapi import Depends

from app.config import get_settings, Settings
from app.services import TrackingService, CalibrationService
from app.websockets import (
    TrackingWebSocketManager,
    StreamWebSocketManager,
)
from app.websockets.multi_tracking_manager import MultiCameraTrackingWebSocketManager

# Singleton instances
_tracking_service: Optional[TrackingService] = None
_calibration_service: Optional[CalibrationService] = None
_tracking_ws_manager: Optional[TrackingWebSocketManager] = None
_stream_ws_manager: Optional[StreamWebSocketManager] = None
_multi_camera_ws_manager: Optional[MultiCameraTrackingWebSocketManager] = None


def get_tracking_service(settings: Optional[Settings] = None) -> TrackingService:
    """Get TrackingService instance (singleton)."""
    global _tracking_service
    if _tracking_service is None:
        if settings is None:
            settings = get_settings()
        track_file = str(settings.track_file)
        _tracking_service = TrackingService(track_file, expected_scene_id=settings.EXPECTED_SCENE_ID)
    return _tracking_service


def get_calibration_service(settings: Optional[Settings] = None) -> CalibrationService:
    """Get CalibrationService instance (singleton)."""
    global _calibration_service
    if _calibration_service is None:
        if settings is None:
            settings = get_settings()
        calib_file = str(settings.calibration_file)
        _calibration_service = CalibrationService(calib_file)
    return _calibration_service


def get_tracking_ws_manager(
    tracking_service: Optional[TrackingService] = None,
    calibration_service: Optional[CalibrationService] = None,
) -> TrackingWebSocketManager:
    """Get TrackingWebSocketManager instance."""
    global _tracking_ws_manager
    if _tracking_ws_manager is None:
        if tracking_service is None:
            tracking_service = get_tracking_service()
        if calibration_service is None:
            calibration_service = get_calibration_service()
        _tracking_ws_manager = TrackingWebSocketManager(tracking_service, calibration_service)
    return _tracking_ws_manager


def get_stream_ws_manager(
    tracking_service: Optional[TrackingService] = None,
    calibration_service: Optional[CalibrationService] = None,
    settings: Optional[Settings] = None,
) -> StreamWebSocketManager:
    """Get StreamWebSocketManager instance."""
    global _stream_ws_manager
    if _stream_ws_manager is None:
        if tracking_service is None:
            tracking_service = get_tracking_service()
        if calibration_service is None:
            calibration_service = get_calibration_service()
        if settings is None:
            settings = get_settings()
        video_dir = str(settings.video_dir)
        _stream_ws_manager = StreamWebSocketManager(tracking_service, calibration_service, video_dir)
    return _stream_ws_manager


def get_multi_camera_ws_manager(
    tracking_service: Optional[TrackingService] = None,
    calibration_service: Optional[CalibrationService] = None,
) -> MultiCameraTrackingWebSocketManager:
    """Get MultiCameraTrackingWebSocketManager instance."""
    global _multi_camera_ws_manager
    if _multi_camera_ws_manager is None:
        if tracking_service is None:
            tracking_service = get_tracking_service()
        if calibration_service is None:
            calibration_service = get_calibration_service()
        _multi_camera_ws_manager = MultiCameraTrackingWebSocketManager(tracking_service, calibration_service)
    return _multi_camera_ws_manager


# Dependency injection functions for FastAPI Depends
def get_tracking_service_dep(settings: Settings = Depends(get_settings)) -> TrackingService:
    """Dependency injection wrapper for TrackingService."""
    return get_tracking_service(settings)


def get_calibration_service_dep(settings: Settings = Depends(get_settings)) -> CalibrationService:
    """Dependency injection wrapper for CalibrationService."""
    return get_calibration_service(settings)


def get_tracking_ws_manager_dep(
    tracking_service: TrackingService = Depends(get_tracking_service_dep),
    calibration_service: CalibrationService = Depends(get_calibration_service_dep),
) -> TrackingWebSocketManager:
    """Dependency injection wrapper for TrackingWebSocketManager."""
    return get_tracking_ws_manager(tracking_service, calibration_service)


def get_stream_ws_manager_dep(
    tracking_service: TrackingService = Depends(get_tracking_service_dep),
    calibration_service: CalibrationService = Depends(get_calibration_service_dep),
    settings: Settings = Depends(get_settings),
) -> StreamWebSocketManager:
    """Dependency injection wrapper for StreamWebSocketManager."""
    return get_stream_ws_manager(tracking_service, calibration_service, settings)


def get_multi_camera_ws_manager_dep(
    tracking_service: TrackingService = Depends(get_tracking_service_dep),
    calibration_service: CalibrationService = Depends(get_calibration_service_dep),
) -> MultiCameraTrackingWebSocketManager:
    """Dependency injection wrapper for MultiCameraTrackingWebSocketManager."""
    return get_multi_camera_ws_manager(tracking_service, calibration_service)

