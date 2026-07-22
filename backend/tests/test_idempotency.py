import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import Base
from app.idempotency import run_idempotent
from app.models import MarinaState, User
from app.schemas import GameActionResponse, PlayerResponse


@pytest.mark.asyncio
async def test_run_idempotent_returns_stored_response_without_repeating_operation():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        user = User(telegram_id=1, username="tester", first_name="Tester")
        user.marina = MarinaState()
        session.add(user)
        await session.commit()
        await session.refresh(user, ["marina"])

        calls = 0

        async def operation() -> GameActionResponse:
            nonlocal calls
            calls += 1
            user.experience += 5
            await session.flush()
            return GameActionResponse(
                message="ok",
                player=PlayerResponse.model_validate(user),
            )

        first = await run_idempotent(
            session=session,
            user=user,
            endpoint="actions",
            key="same-request",
            response_model=GameActionResponse,
            operation=operation,
        )
        second = await run_idempotent(
            session=session,
            user=user,
            endpoint="actions",
            key="same-request",
            response_model=GameActionResponse,
            operation=operation,
        )

    await engine.dispose()

    assert calls == 1
    assert first == second
    assert second.player.experience == 5
