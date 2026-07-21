import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine


def build_database_url() -> str | None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return None

    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    return database_url


DATABASE_URL = build_database_url()
engine: AsyncEngine | None = (
    create_async_engine(DATABASE_URL, pool_pre_ping=True) if DATABASE_URL else None
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    if engine is not None:
        await engine.dispose()


app = FastAPI(title="Day Marina API", version="0.2.0", lifespan=lifespan)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PlayerState(BaseModel):
    day: int = 1
    period: str = "morning"
    love: int = 78
    mood: int = 64
    energy: int = 53
    hunger: int = 72
    calm: int = 68
    coins: int = 1250
    crystals: int = 25


@app.get("/")
def root() -> dict[str, str]:
    return {"name": "Day Marina API", "status": "running"}


@app.get("/health")
async def health() -> dict[str, str]:
    database_status = "not_configured"

    if engine is not None:
        try:
            async with engine.connect() as connection:
                await connection.execute(text("SELECT 1"))
            database_status = "ok"
        except Exception:
            database_status = "error"

    return {"status": "ok", "database": database_status}


@app.get("/api/v1/state", response_model=PlayerState)
def get_state() -> PlayerState:
    return PlayerState()
