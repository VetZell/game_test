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


def signed_init_data(*, user_id: int = 7101) -> str:
    values = {
        "auth_date": str(int(time.time())),
        "user": json.dumps({"id": user_id, "first_name": "Action", "username": "action"}, separators=(",", ":")),
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
async def test_coffee_action_response_contract_and_idempotency(client):
    init_data = signed_init_data()
    first = await client.post(
        "/api/v1/actions",
        json={"init_data": init_data, "action": "coffee", "idempotency_key": "coffee-action"},
    )
    replay = await client.post(
        "/api/v1/actions",
        json={"init_data": init_data, "action": "coffee", "idempotency_key": "coffee-action"},
    )
    conflict = await client.post(
        "/api/v1/actions",
        json={"init_data": init_data, "action": "breakfast", "idempotency_key": "coffee-action"},
    )

    assert first.status_code == 200
    assert replay.status_code == 200
    assert conflict.status_code == 409
    assert first.json() == replay.json()
    payload = first.json()
    assert payload["message"] == "Спасибо! Такой кофе — идеальное начало утра ☕"
    assert payload["player"]["telegram_id"] == 7101
    assert payload["player"]["coins"] == 985
    assert payload["player"]["experience"] == 4
    assert payload["player"]["marina"]["energy"] == 100
    assert payload["player"]["marina"]["mood"] == 85


@pytest.mark.asyncio
async def test_action_endpoint_rejects_missing_telegram_auth(client):
    response = await client.post("/api/v1/actions", json={"init_data": "", "action": "coffee"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_action_endpoint_works_after_alembic_migration_without_runtime_create_all(tmp_path, monkeypatch):
    from tests.test_alembic_existing_database import run_alembic

    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", BOT_TOKEN)
    database_path = tmp_path / "migrated-action.sqlite"
    run_alembic(database_path, "upgrade", "head")

    engine = create_async_engine(f"sqlite+aiosqlite:///{database_path}")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_session():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as test_client:
            response = await test_client.post(
                "/api/v1/actions",
                json={
                    "init_data": signed_init_data(user_id=8101),
                    "action": "coffee",
                    "idempotency_key": "migrated-coffee-action",
                },
            )
            replay = await test_client.post(
                "/api/v1/actions",
                json={
                    "init_data": signed_init_data(user_id=8101),
                    "action": "coffee",
                    "idempotency_key": "migrated-coffee-action",
                },
            )
    finally:
        app.dependency_overrides.clear()
        await engine.dispose()

    assert response.status_code == 200
    assert replay.status_code == 200
    assert response.json() == replay.json()
