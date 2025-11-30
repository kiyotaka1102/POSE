"""
Services Module - Business Logic Layer

This module contains all business logic services that handle:
- Data processing and transformation
- Business rules and validations
- Integration with external systems
- Complex calculations and algorithms

Services are stateless and can be reused across different controllers.
"""
from .tracking_service import TrackingService
from .calibration_service import CalibrationService
from .projection_service import ProjectionService
from .projection_fast import ProjectionServiceFast

__all__ = [
    'TrackingService',
    'CalibrationService',
    'ProjectionService',
    'ProjectionServiceFast'
]

