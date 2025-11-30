"""Authentication service for user management."""
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import get_settings
from app.models import UserResponse

settings = get_settings()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


async def authenticate_user(
    db: AsyncIOMotorDatabase,
    email: str,
    password: str
) -> Optional[UserResponse]:
    """
    Authenticate a user by email and password.
    
    Args:
        db: MongoDB database instance
        email: User email address
        password: Plain text password
        
    Returns:
        UserResponse if authentication successful, None otherwise
    """
    try:
        # Find user by email in the users collection
        user_doc = await db.users.find_one({"emailAddress": email})
        
        if not user_doc:
            return None
        
        # Verify password
        stored_password = user_doc.get("password", "")
        if not verify_password(password, stored_password):
            return None
        
        # Return user data (excluding password)
        return UserResponse(
            id=user_doc.get("id"),
            fullName=user_doc.get("fullName", ""),
            emailAddress=user_doc.get("emailAddress", ""),
            role=user_doc.get("role", ""),
            address=user_doc.get("address"),
            dateOfBirth=user_doc.get("dateOfBirth"),
            gender=user_doc.get("gender")
        )
    except Exception as e:
        print(f"Error authenticating user: {e}")
        return None


async def get_user_by_id(db: AsyncIOMotorDatabase, user_id: int) -> Optional[UserResponse]:
    """Get user by ID."""
    try:
        user_doc = await db.users.find_one({"id": user_id})
        if not user_doc:
            return None
        
        return UserResponse(
            id=user_doc.get("id"),
            fullName=user_doc.get("fullName", ""),
            emailAddress=user_doc.get("emailAddress", ""),
            role=user_doc.get("role", ""),
            address=user_doc.get("address"),
            dateOfBirth=user_doc.get("dateOfBirth"),
            gender=user_doc.get("gender")
        )
    except Exception as e:
        print(f"Error getting user: {e}")
        return None

