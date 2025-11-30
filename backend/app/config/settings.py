"""Application settings using Pydantic Settings."""
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "POSE Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = False
    
    # CORS
    CORS_ORIGINS: List[str] = Field(
        default=["*"],
        description="Allowed CORS origins"
    )
    CORS_CREDENTIALS: bool = True
    CORS_METHODS: List[str] = Field(
        default=["*"],
        description="Allowed HTTP methods"
    )
    CORS_HEADERS: List[str] = Field(
        default=["*"],
        description="Allowed HTTP headers"
    )
    
    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = Field(
        default_factory=lambda: Path(__file__).resolve().parent.parent.parent / "data"
    )
    WAREHOUSE_SCENE: str = "Warehouse_017"
    
    @property
    def video_dir(self) -> Path:
        """Get video directory path."""
        return self.DATA_DIR / self.WAREHOUSE_SCENE / "videos"
    
    @property
    def track_file(self) -> Path:
        """Get track file path."""
        return self.DATA_DIR / self.WAREHOUSE_SCENE / "track1_class.txt"
    
    @property
    def calibration_file(self) -> Path:
        """Get calibration file path."""
        return self.DATA_DIR / self.WAREHOUSE_SCENE / "calibration.json"
    
    # MongoDB (for future configuration)
    MONGODB_URL: str = Field(
        default="mongodb://localhost:27017",
        description="MongoDB connection URL"
    )
    MONGODB_DB_NAME: str = Field(
        default="pose_db",
        description="MongoDB database name"
    )
    MONGODB_USERNAME: Optional[str] = None
    MONGODB_PASSWORD: Optional[str] = None
    
    # Tracking Service
    EXPECTED_SCENE_ID: int = 17
    
    # WebSocket
    WS_MAX_CONNECTIONS: int = 100
    WS_HEARTBEAT_INTERVAL: int = 30  # seconds
    WS_FRAME_CACHE_SIZE: int = 100
    
    # Authentication
    JWT_SECRET_KEY: str = Field(
        default="your-secret-key-change-in-production",
        description="Secret key for JWT token signing"
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30 * 24 * 60  # 30 days
    
    class Config:
        """Pydantic config."""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

