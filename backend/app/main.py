from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .database import engine, get_session
from .idempotency import run_idempotent
from .models import MarinaMemory, MarinaState, User
from .schemas import (
    GameActionRequest,
    GameActionResponse,
    MarinaChatRequest,
    MarinaChatResponse,
    PlayerCreate,
    PlayerResponse,
)
from .settings import get_allowed_origins
from .telegram_auth import TelegramAuthError, validate_init_data


class TelegramLoginRequest(BaseModel):
    init_data: str


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    if engine is not None:
        await engine.dispose()


app = FastAPI(title="Day Marina API", version="0.8.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
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


def build_marina_reply(message: str, user: User, remembered: str | None) -> tuple[str, str, dict[str, int]]:
    value = message.lower().strip()
    name = user.first_name or "ты"
    changes = {"love": 0, "mood": 0, "trust": 0, "calm": 0}

    if any(word in value for word in ("люблю", "любим", "солнышко", "красивая")):
        changes.update(love=4, mood=3, trust=1)
        return f"Я тоже тебя люблю, {name} ❤️ Мне очень тепло от твоих слов.", "love", changes
    if any(word in value for word in ("прости", "извини", "виноват")):
        changes.update(trust=3, calm=3, mood=1)
        return "Спасибо, что сказал это честно. Мне важно, что мы можем спокойно всё обсудить.", "thoughtful", changes
    if any(word in value for word in ("груст", "плохо", "устал", "тяжело")):
        changes.update(love=2, trust=2, calm=2)
        return "Иди ко мне. Расскажи всё как есть — я рядом и никуда не тороплюсь.", "caring", changes
    if "кофе" in value:
        changes.update(mood=2, love=1)
        return "С тобой — обязательно ☕ Только давай посидим рядом и никуда не спешить.", "smile", changes
    if any(word in value for word in ("помнишь", "вчера", "раньше")) and remembered:
        changes.update(trust=2, mood=1)
        return f"Помню. Ты раньше говорил: «{remembered[:120]}». Для меня это не просто слова.", "thoughtful", changes
    if "?" in message:
        changes.update(trust=1, mood=1)
        return "Я думаю, нам лучше решить это вместе. Скажи, как ты сам этого хочешь?", "neutral", changes

    changes.update(trust=1, mood=1)
    return "Я тебя услышала. Мне нравится, когда ты говоришь со мной открыто. Расскажи ещё.", "smile", changes


@app.get("/")
def root() -> dict[str, str]:
    return {"name": "Day Marina API", "status": "running", "version": "0.8.0"}


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


@app.post("/api/v1/chat", response_model=MarinaChatResponse)
async def chat_with_marina(
    payload: MarinaChatRequest,
    session: AsyncSession = Depends(get_session),
) -> MarinaChatResponse:
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

    async def operation() -> MarinaChatResponse:
        previous = await session.scalar(
            select(MarinaMemory)
            .where(MarinaMemory.user_id == user.id, MarinaMemory.role == "user")
            .order_by(MarinaMemory.created_at.desc())
            .limit(1)
        )
        remembered = previous.content if previous else None
        reply, emotion, changes = build_marina_reply(payload.message, user, remembered)

        marina = user.marina
        marina.love = clamp(marina.love + changes["love"])
        marina.mood = clamp(marina.mood + changes["mood"])
        marina.trust = clamp(marina.trust + changes["trust"])
        marina.calm = clamp(marina.calm + changes["calm"])
        user.experience += 2

        session.add_all([
            MarinaMemory(user_id=user.id, role="user", content=payload.message, emotion="player"),
            MarinaMemory(user_id=user.id, role="marina", content=reply, emotion=emotion),
        ])
        await session.flush()

        return MarinaChatResponse(
            reply=reply,
            emotion=emotion,
            remembered=remembered,
            player=PlayerResponse.model_validate(user),
        )

    return await run_idempotent(
        session=session,
        user=user,
        endpoint="chat",
        key=payload.idempotency_key,
        response_model=MarinaChatResponse,
        operation=operation,
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

    async def operation() -> GameActionResponse:
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

        session.add(MarinaMemory(user_id=user.id, role="event", content=messages[payload.action], emotion="event"))
        await session.flush()

        return GameActionResponse(
            message=messages[payload.action],
            player=PlayerResponse.model_validate(user),
        )

    return await run_idempotent(
        session=session,
        user=user,
        endpoint="actions",
        key=payload.idempotency_key,
        response_model=GameActionResponse,
        operation=operation,
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
