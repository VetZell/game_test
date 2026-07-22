import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import httpx
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import Base, get_session
from app.main import app

BOT_TOKEN = "test-bot-token"


def signed_init_data(*, user_id: int, first_name: str = "Tester", username: str = "tester") -> str:
    values = {
        "auth_date": str(int(time.time())),
        "user": json.dumps(
            {"id": user_id, "first_name": first_name, "username": username},
            separators=(",", ":"),
        ),
    }
    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(values.items()))
    secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode("utf-8"), hashlib.sha256).digest()
    values["hash"] = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
    return urlencode(values)


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


@pytest.mark.asyncio
async def test_player_helper_endpoints_are_not_publicly_available(client):
    create_response = await client.post(
        "/api/v1/players",
        json={"telegram_id": 2002, "username": "intruder", "first_name": "Intruder"},
    )
    read_response = await client.get("/api/v1/players/2002")

    assert create_response.status_code == 404
    assert read_response.status_code == 404


@pytest.mark.asyncio
async def test_removed_player_helpers_cannot_create_or_read_another_user(client):
    owner_init_data = signed_init_data(user_id=3003, first_name="Owner", username="owner")
    auth_response = await client.post("/api/v1/auth/telegram", json={"init_data": owner_init_data})
    assert auth_response.status_code == 200
    assert auth_response.json()["telegram_id"] == 3003

    create_other = await client.post(
        "/api/v1/players",
        json={"telegram_id": 4004, "username": "other", "first_name": "Other"},
    )
    read_owner = await client.get("/api/v1/players/3003")
    read_other = await client.get("/api/v1/players/4004")

    assert create_other.status_code == 404
    assert read_owner.status_code == 404
    assert read_other.status_code == 404


@pytest.mark.asyncio
async def test_telegram_auth_chat_and_actions_flows_still_work(client):
    init_data = signed_init_data(user_id=5005, first_name="Flow", username="flow")

    auth_response = await client.post("/api/v1/auth/telegram", json={"init_data": init_data})
    chat_response = await client.post(
        "/api/v1/chat",
        json={"init_data": init_data, "message": "Привет", "idempotency_key": "chat-flow-key"},
    )
    action_response = await client.post(
        "/api/v1/actions",
        json={"init_data": init_data, "action": "hug", "idempotency_key": "action-flow-key"},
    )

    assert auth_response.status_code == 200
    assert chat_response.status_code == 200
    assert action_response.status_code == 200
    assert auth_response.json()["telegram_id"] == 5005
    assert chat_response.json()["player"]["telegram_id"] == 5005
    assert action_response.json()["player"]["telegram_id"] == 5005


@pytest.mark.asyncio
async def test_chat_and_actions_still_reject_missing_telegram_auth(client):
    chat_response = await client.post("/api/v1/chat", json={"init_data": "", "message": "Привет"})
    action_response = await client.post("/api/v1/actions", json={"init_data": "", "action": "hug"})

    assert chat_response.status_code == 401
    assert action_response.status_code == 401
