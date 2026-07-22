import os

LOCAL_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)
LOCAL_ENVIRONMENTS = {"local", "development", "dev", "test"}


def get_environment() -> str:
    return os.getenv("ENVIRONMENT", os.getenv("APP_ENV", "production")).strip().lower()


def parse_cors_origins(raw_origins: str | None) -> list[str]:
    origins: list[str] = []
    for origin in (raw_origins or "").split(","):
        normalized = origin.strip().rstrip("/")
        if normalized and normalized not in origins:
            origins.append(normalized)
    return origins


def get_allowed_origins() -> list[str]:
    origins = parse_cors_origins(os.getenv("CORS_ORIGINS"))
    if get_environment() in LOCAL_ENVIRONMENTS:
        for origin in LOCAL_CORS_ORIGINS:
            if origin not in origins:
                origins.append(origin)
    return origins
