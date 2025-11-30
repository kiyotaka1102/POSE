"""
WebSocket Module - Real-time Communication Layer

This module contains:
- handlers.py: WebSocket controllers (receive connections, route messages)
- managers/: WebSocket managers (manage connections, broadcast messages)
- stream_manager.py: Video streaming service
- tracking_manager.py: Tracking data broadcasting service
- multi_tracking_manager.py: Multi-camera tracking service

Handlers are controllers that receive WebSocket connections.
Managers are services that handle the business logic of WebSocket communication.
"""
from .tracking_manager import TrackingWebSocketManager
from .stream_manager import StreamWebSocketManager

__all__ = ['TrackingWebSocketManager', 'StreamWebSocketManager']
