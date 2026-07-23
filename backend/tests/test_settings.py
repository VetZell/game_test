from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
import pytest

from app.settings import get_allowed_origins, get_environment, parse_cors_origins


def test_parse_cors_origins_trims_deduplicates_and_strips_slashes():
    assert parse_cors_origins(" https://example.com/,https://example.com, http://localhost:5173/ ") == [
        "https://example.com",
        "http://localhost:5173",
    ]


def test_environment_defaults_to_production(monkeypatch):
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("APP_ENV", raising=False)

    assert get_environment() == "production"
    assert get_allowed_origins() == []


def test_development_keeps_local_origins_when_explicit(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "development")

    assert get_allowed_origins() == ["http://localhost:5173", "http://127.0.0.1:5173"]


def test_production_uses_only_explicit_origins(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("CORS_ORIGINS", "https://frontend.example.com, https://admin.example.com/")

    assert get_allowed_origins() == ["https://frontend.example.com", "https://admin.example.com"]


@pytest.mark.asyncio
async def test_action_preflight_allows_configured_production_origin(monkeypatch):
    frontend_origin = "https://day-marina-frontend.up.railway.app"
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("CORS_ORIGINS", frontend_origin)

    test_app = FastAPI()
    test_app.add_middleware(
        CORSMiddleware,
        allow_origins=get_allowed_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    @test_app.post("/api/v1/actions")
    async def actions():
        return {"ok": True}

    transport = httpx.ASGITransport(app=test_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.options(
            "/api/v1/actions",
            headers={
                "Origin": frontend_origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == frontend_origin
    assert "POST" in response.headers["access-control-allow-methods"]


@pytest.mark.asyncio
async def test_action_preflight_rejects_unconfigured_production_origin(monkeypatch):
    frontend_origin = "https://day-marina-frontend.up.railway.app"
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("CORS_ORIGINS", "https://other.example.com")

    test_app = FastAPI()
    test_app.add_middleware(
        CORSMiddleware,
        allow_origins=get_allowed_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    @test_app.post("/api/v1/actions")
    async def actions():
        return {"ok": True}

    transport = httpx.ASGITransport(app=test_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.options(
            "/api/v1/actions",
            headers={
                "Origin": frontend_origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
