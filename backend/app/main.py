import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .database import Base, engine, get_session
from .models import MarinaState, User
from .schemas import GameActionRequest, GameActionResponse, PlayerCreate, PlayerResponse
from .telegram_auth import TelegramAuthError, validate_init_data


class TelegramLoginRequest(BaseModel):
    init_data: str


@asynccontextmanager
async def lifespan(_: FastAPI):
    if engine is not None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
    yield
    if engine is not None:
        await engine.dispose()


app = FastAPI(title="Day Marina API", version="0.6.0", lifespan=lifespan)

allowed_origins = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://gametest-production-9fef.up.railway.app",
}
allowed_origins.update(
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins),
    allow_origin_regex=r"https://.*\.up\.railway\.app",
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def player_query(telegram_id: int):
    return select(User).options(selectinload(User.marina)).where(User.telegram_id == telegram_id)


async def get_or_create_player(payload: PlayerCreate, session: AsyncSession) -> User:
    query = player_query(payload.telegram_id)
    user = await session.scalar(query)
    if user is not None:
        user.username = payload.username
        user.first_name = payload.first_name
        await session.commit()
        refreshed = await session.scalar(query)
        return refreshed or user

    user = User(
        telegram_id=payload.telegram_id,
        username=payload.username,
        first_name=payload.first_name,
    )
    user.marina = MarinaState()
    session.add(user)
    await session.commit()
    created_user = await session.scalar(query)
    if created_user is None:
        raise HTTPException(status_code=500, detail="Failed to create player")
    return created_user


def clamp(value: int) -> int:
    return max(0, min(100, value))


def authenticate(init_data: str):
    try:
        return validate_init_data(init_data)
    except TelegramAuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@app.get("/")
def root() -> dict[str, str]:
    return {"name": "Day Marina API", "status": "running", "version": "0.6.0"}


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


@app.post("/api/v1/auth/telegram", response_model=PlayerResponse)
async def telegram_login(
    payload: TelegramLoginRequest,
    session: AsyncSession = Depends(get_session),
) -> User:
    telegram_user = authenticate(payload.init_data)
    return await get_or_create_player(
        PlayerCreate(
            telegram_id=telegram_user.id,
            username=telegram_user.username,
            first_name=telegram_user.first_name,
        ),
        session,
    )


@app.post("/api/v1/actions", response_model=GameActionResponse)
async def perform_action(
    payload: GameActionRequest,
    session: AsyncSession = Depends(get_session),
) -> GameActionResponse:
    telegram_user = authenticate(payload.init_data)
    user = await session.scalar(player_query(telegram_user.id))
    if user is None:
        user = await get_or_create_player(
            PlayerCreate(
                telegram_id=telegram_user.id,
                username=telegram_user.username,
                first_name=telegram_user.first_name,
            ),
            session,
        )

    marina = user.marina
    messages = {
        "hug": "Марина прижалась к тебе и улыбнулась ❤️",
        "coffee": "Спасибо! Такой кофе — идеальное начало утра ☕",
        "breakfast": "Как вкусно! Теперь я сытая и счастливая 🥞",
        "kind_words": "Ты умеешь говорить именно то, что мне нужно услышать 💌",
        "walk": "Свежий воздух пошёл нам на пользу. Мне стало спокойнее 🌿",
        "movie": "Давай устроимся поудобнее и посмотрим что-нибудь вместе 🎬",
        "talk": "Мне стало намного легче после нашего разговора.",
    }

    if payload.action == "hug":
        marina.love = clamp(marina.love + 8)
        marina.attachment = clamp(marina.attachment + 4)
        marina.mood = clamp(marina.mood + 3)
        user.experience += 5
    elif payload.action == "coffee":
        marina.energy = clamp(marina.energy + 10)
        marina.mood = clamp(marina.mood + 5)
        user.coins = max(0, user.coins - 15)
        user.experience += 4
    elif payload.action == "breakfast":
        marina.hunger = clamp(marina.hunger + 15)
        marina.love = clamp(marina.love + 5)
        user.coins = max(0, user.coins - 25)
        user.experience += 6
    elif payload.action == "kind_words":
        marina.love = clamp(marina.love + 10)
        marina.mood = clamp(marina.mood + 10)
        marina.trust = clamp(marina.trust + 3)
        user.experience += 7
    elif payload.action == "walk":
        marina.energy = clamp(marina.energy + 15)
        marina.calm = clamp(marina.calm + 5)
        marina.mood = clamp(marina.mood + 4)
        user.experience += 7
    elif payload.action == "movie":
        marina.mood = clamp(marina.mood + 10)
        marina.calm = clamp(marina.calm + 5)
        marina.attachment = clamp(marina.attachment + 2)
        user.coins = max(0, user.coins - 20)
        user.experience += 6
    elif payload.action == "talk":
        marina.mood = clamp(marina.mood + 10)
        marina.trust = clamp(marina.trust + 5)
        marina.calm = clamp(marina.calm + 4)
        user.experience += 6
    else:
        raise HTTPException(status_code=400, detail="Неизвестное действие")

    await session.commit()
    refreshed = await session.scalar(player_query(telegram_user.id))
    if refreshed is None:
        raise HTTPException(status_code=500, detail="Не удалось сохранить действие")

    return GameActionResponse(
        message=messages[payload.action],
        player=PlayerResponse.model_validate(refreshed),
    )


@app.post("/api/v1/players", response_model=PlayerResponse, status_code=status.HTTP_201_CREATED)
async def create_or_get_player(
    payload: PlayerCreate,
    session: AsyncSession = Depends(get_session),
) -> User:
    return await get_or_create_player(payload, session)


@app.get("/api/v1/players/{telegram_id}", response_model=PlayerResponse)
async def get_player(
    telegram_id: int,
    session: AsyncSession = Depends(get_session),
) -> User:
    user = await session.scalar(player_query(telegram_id))
    if user is None:
        raise HTTPException(status_code=404, detail="Player not found")
    return user


@app.get("/api/v1/state")
def get_demo_state() -> dict[str, int | str]:
    return {
        "day": 1,
        "period": "morning",
        "love": 78,
        "mood": 64,
        "energy": 53,
        "hunger": 72,
        "calm": 68,
        "coins": 1250,
        "crystals": 25,
    }
