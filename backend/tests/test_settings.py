from app.settings import get_allowed_origins, parse_cors_origins


def test_parse_cors_origins_trims_deduplicates_and_strips_slashes():
    assert parse_cors_origins(" https://example.com/,https://example.com, http://localhost:5173/ ") == [
        "https://example.com",
        "http://localhost:5173",
    ]


def test_development_keeps_local_origins(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "development")

    assert get_allowed_origins() == ["http://localhost:5173", "http://127.0.0.1:5173"]


def test_production_uses_only_explicit_origins(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("CORS_ORIGINS", "https://frontend.example.com, https://admin.example.com/")

    assert get_allowed_origins() == ["https://frontend.example.com", "https://admin.example.com"]
