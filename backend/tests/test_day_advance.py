import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import httpx
import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import Base, get_session
from app.game_services import PERIOD_DELTAS, advance_day_period, apply_day_advance_state
from app.main import app
from app.models import MarinaMemory, MarinaState, User

BOT_TOKEN = "test-bot-token"


def signed_init_data(*, user_id: int = 9001) -> str:
    values = {
        "auth_date": str(int(time.time())),
        "user": json.dumps({"id": user_id, "first_name": "Tester", "username": "tester"}, separators=(",", ":")),
    }
    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(values.items()))
    secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    values["hash"] = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    return urlencode(values)


@pytest_asyncio.fixture
async def session_with_user():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with session_factory() as session:
        user = User(telegram_id=9001, username="tester", first_name="Tester")
        user.marina = MarinaState()
        session.add(user)
        await session.commit()
        await session.refresh(user, ["marina"])
        yield session, user
    await engine.dispose()


@pytest_asyncio.fixture
async def client(monkeypatch):
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", BOT_TOKEN)
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async def override_get_session():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as test_client:
        yield test_client
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.parametrize(
    ("start", "expected_period", "expected_day"),
    [("morning", "day", 3), ("day", "evening", 3), ("evening", "night", 3), ("night", "morning", 4)],
)
def test_apply_day_advance_state_period_cycle_and_day_increment(start, expected_period, expected_day):
    user = User(telegram_id=1, coins=321, crystals=7, level=5, experience=99)
    user.marina = MarinaState(day=3, period=start, energy=50, hunger=50, mood=50, calm=50, love=60, trust=61, attachment=62, romance=63)

    message = apply_day_advance_state(user)
    deltas = PERIOD_DELTAS[expected_period]

    assert user.marina.period == expected_period
    assert user.marina.day == expected_day
    assert user.marina.energy == 50 + deltas["energy"]
    assert user.marina.hunger == 50 + deltas["hunger"]
    assert user.marina.mood == 50 + deltas["mood"]
    assert user.marina.calm == 50 + deltas["calm"]
    assert (user.coins, user.crystals, user.level, user.experience) == (321, 7, 5, 99)
    assert (user.marina.love, user.marina.trust, user.marina.attachment, user.marina.romance) == (60, 61, 62, 63)
    assert message


def test_apply_day_advance_state_clamps_needs():
    user = User(telegram_id=1)
    user.marina = MarinaState(day=1, period="night", energy=95, hunger=2, mood=98, calm=94)

    apply_day_advance_state(user)

    assert user.marina.period == "morning"
    assert user.marina.day == 2
    assert user.marina.energy == 100
    assert user.marina.hunger == 0
    assert user.marina.mood == 100
    assert user.marina.calm == 100


@pytest.mark.asyncio
async def test_advance_day_period_creates_one_event_memory(session_with_user):
    session, user = session_with_user

    response = await advance_day_period(session=session, user=user)
    memories = (await session.scalars(select(MarinaMemory))).all()

    assert response.player.marina.period == "day"
    assert response.player.marina.day == 1
    assert len(memories) == 1
    assert memories[0].role == "event"
    assert memories[0].emotion == "smile"
    assert "day" in memories[0].content


@pytest.mark.asyncio
async def test_day_advance_rejects_missing_telegram_auth(client):
    response = await client.post("/api/v1/day/advance", json={"init_data": "", "idempotency_key": "day-key"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_day_advance_endpoint_idempotent_replay_and_conflict(client):
    init_data = signed_init_data()
    auth = await client.post("/api/v1/auth/telegram", json={"init_data": init_data})
    assert auth.status_code == 200

    first = await client.post("/api/v1/day/advance", json={"init_data": init_data, "idempotency_key": "same-day"})
    replay = await client.post("/api/v1/day/advance", json={"init_data": init_data, "idempotency_key": "same-day"})
    conflict = await client.post("/api/v1/day/advance", json={"init_data": init_data, "advance": "different", "idempotency_key": "same-day"})

    assert first.status_code == 200
    assert replay.status_code == 200
    assert first.json() == replay.json()
    assert first.json()["player"]["marina"]["period"] == "day"
    assert conflict.status_code == 409

    # A different authenticated user can reuse the same idempotency key independently.
    other_init = signed_init_data(user_id=9002)
    other = await client.post("/api/v1/day/advance", json={"init_data": other_init, "idempotency_key": "same-day"})
    assert other.status_code == 200
