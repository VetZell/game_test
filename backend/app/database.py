import os
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase


def build_database_url() -> str | None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return None

    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return database_url


class Base(DeclarativeBase):
    pass


DATABASE_URL = build_database_url()
engine: AsyncEngine | None = (
    create_async_engine(DATABASE_URL, pool_pre_ping=True) if DATABASE_URL else None
)
SessionLocal = (
    async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    if engine is not None
    else None
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL is not configured")

    async with SessionLocal() as session:
        yield session
