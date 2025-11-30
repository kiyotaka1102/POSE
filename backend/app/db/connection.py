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
        # Support both mongodb:// and mongodb+srv:// URLs
        connection_url = settings.MONGODB_URL
        
        # If URL already contains credentials (mongodb+srv://user:pass@host), use it directly
        # Otherwise, if username/password are provided separately, construct the URL
        if settings.MONGODB_USERNAME and settings.MONGODB_PASSWORD:
            # Check if URL already has credentials
            if '@' not in connection_url:
                # URL doesn't have credentials, add them
                if connection_url.startswith('mongodb+srv://'):
                    # mongodb+srv:// format
                    connection_url = connection_url.replace(
                        'mongodb+srv://',
                        f'mongodb+srv://{settings.MONGODB_USERNAME}:{settings.MONGODB_PASSWORD}@'
                    )
                elif connection_url.startswith('mongodb://'):
                    # mongodb:// format
                    connection_url = connection_url.replace(
                        'mongodb://',
                        f'mongodb://{settings.MONGODB_USERNAME}:{settings.MONGODB_PASSWORD}@'
                    )
        
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

