from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .database import engine, get_session
from .game_services import advance_day_period, apply_chat_message, apply_game_action
from .idempotency import request_fingerprint, run_idempotent
from .models import MarinaState, User
from .schemas import (
    DayAdvanceRequest,
    DayAdvanceResponse,
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


def authenticate(init_data: str):
    try:
        return validate_init_data(init_data)
    except TelegramAuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


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
        return await apply_chat_message(session=session, user=user, message=payload.message)

    return await run_idempotent(
        session=session,
        user=user,
        endpoint="chat",
        key=payload.idempotency_key,
        fingerprint=request_fingerprint({"message": payload.message}),
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
        response = await apply_game_action(session=session, user=user, action=payload.action)
        if response is None:
            raise HTTPException(status_code=400, detail="Неизвестное действие")
        return response

    return await run_idempotent(
        session=session,
        user=user,
        endpoint="actions",
        key=payload.idempotency_key,
        fingerprint=request_fingerprint({"action": payload.action}),
        response_model=GameActionResponse,
        operation=operation,
    )


@app.post("/api/v1/day/advance", response_model=DayAdvanceResponse)
async def advance_day(
    payload: DayAdvanceRequest,
    session: AsyncSession = Depends(get_session),
) -> DayAdvanceResponse:
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

    async def operation() -> DayAdvanceResponse:
        return await advance_day_period(session=session, user=user)

    return await run_idempotent(
        session=session,
        user=user,
        endpoint="day/advance",
        key=payload.idempotency_key,
        fingerprint=request_fingerprint({"advance": payload.advance}),
        response_model=DayAdvanceResponse,
        operation=operation,
    )
