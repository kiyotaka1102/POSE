"""Main FastAPI application entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.db import init_database, close_database
from app.middleware import setup_cors, LoggingMiddleware, setup_exception_handlers
from app.routes import root_router, info_router, websocket_router, auth_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Initialize database
    await init_database()
    
    # Mount static files for videos
    if settings.video_dir.exists():
        video_static_files = StaticFiles(directory=str(settings.video_dir))
        app.mount("/api/videos", video_static_files, name="videos")
        print(f"📁 Static files mounted at /api/videos")
    else:
        print(f"⚠️  Video directory not found: {settings.video_dir}")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down...")
    await close_database()
    print("✅ Shutdown complete")


# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    debug=settings.DEBUG,
)

# Setup middleware
setup_cors(app)
app.add_middleware(LoggingMiddleware)
setup_exception_handlers(app)

# Register routes
app.include_router(root_router)
app.include_router(info_router)
app.include_router(websocket_router)
app.include_router(auth_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
    )
