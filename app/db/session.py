# app/db/session.py
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from utils.config import settings

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL_ASYNC,
    echo=False,  # Set to True for SQL logging in dev
    future=True,
)

# Async session factory
async_session = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def get_db() :
    """Dependency to inject DB session into routes"""
    async with async_session() as session:
        yield session