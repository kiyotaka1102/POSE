"""MongoDB database connection management."""
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ConnectionFailure

from app.config import get_settings

settings = get_settings()

# Global database client and database instances
_client: Optional[AsyncIOMotorClient] = None
_database: Optional[AsyncIOMotorDatabase] = None


async def init_database() -> None:
    """Initialize MongoDB connection."""
    global _client, _database
    
    try:
        # Build connection URL
        if settings.MONGODB_USERNAME and settings.MONGODB_PASSWORD:
            # Format: mongodb://username:password@host:port/dbname
            connection_url = (
                f"mongodb://{settings.MONGODB_USERNAME}:{settings.MONGODB_PASSWORD}"
                f"@{settings.MONGODB_URL.replace('mongodb://', '')}"
            )
        else:
            connection_url = settings.MONGODB_URL
        
        # Create client
        _client = AsyncIOMotorClient(
            connection_url,
            serverSelectionTimeoutMS=5000,
        )
        
        # Test connection
        await _client.admin.command("ping")
        
        # Get database
        _database = _client[settings.MONGODB_DB_NAME]
        
        print(f"✅ MongoDB connected to database: {settings.MONGODB_DB_NAME}")
        
    except ConnectionFailure as e:
        print(f"❌ MongoDB connection failed: {e}")
        print("⚠️  Continuing without database connection...")
        _client = None
        _database = None
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        print("⚠️  Continuing without database connection...")
        _client = None
        _database = None


async def close_database() -> None:
    """Close MongoDB connection."""
    global _client, _database
    
    if _client:
        _client.close()
        _client = None
        _database = None
        print("✅ MongoDB connection closed")


async def get_database() -> Optional[AsyncIOMotorDatabase]:
    """Get MongoDB database instance."""
    return _database

