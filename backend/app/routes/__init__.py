"""
Controllers Module - Request/Response Handling Layer

This module contains all route controllers (handlers) that:
- Receive HTTP/WebSocket requests
- Validate input data
- Call appropriate services
- Return responses to clients

Controllers should be thin - they only handle routing and call services.
All business logic should be in the services layer.
"""
from .root import router as root_router
from .info import router as info_router
from .websocket_routes import router as websocket_router

__all__ = ['root_router', 'info_router', 'websocket_router']
