"""Dependencies module for dependency injection."""
from .services import (
    get_tracking_service,
    get_calibration_service,
    get_tracking_ws_manager,
    get_stream_ws_manager,
    get_multi_camera_ws_manager,
    get_tracking_service_dep,
    get_calibration_service_dep,
    get_tracking_ws_manager_dep,
    get_stream_ws_manager_dep,
    get_multi_camera_ws_manager_dep,
)

__all__ = [
    "get_tracking_service",
    "get_calibration_service",
    "get_tracking_ws_manager",
    "get_stream_ws_manager",
    "get_multi_camera_ws_manager",
    "get_tracking_service_dep",
    "get_calibration_service_dep",
    "get_tracking_ws_manager_dep",
    "get_stream_ws_manager_dep",
    "get_multi_camera_ws_manager_dep",
]

