import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect, text


def test_alembic_upgrade_handles_existing_create_all_schema(tmp_path):
    database_path = tmp_path / "existing.sqlite"
    sync_engine = create_engine(f"sqlite:///{database_path}")
    with sync_engine.begin() as connection:
        connection.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY, telegram_id BIGINT NOT NULL UNIQUE, username VARCHAR(64), first_name VARCHAR(128) NOT NULL, level INTEGER NOT NULL, experience INTEGER NOT NULL, coins INTEGER NOT NULL, crystals INTEGER NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL)"))
        connection.execute(text("CREATE INDEX ix_users_telegram_id ON users (telegram_id)"))
        connection.execute(text("CREATE TABLE marina_states (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL UNIQUE, day INTEGER NOT NULL, period VARCHAR(16) NOT NULL, love INTEGER NOT NULL, mood INTEGER NOT NULL, energy INTEGER NOT NULL, hunger INTEGER NOT NULL, calm INTEGER NOT NULL, trust INTEGER NOT NULL, attachment INTEGER NOT NULL, romance INTEGER NOT NULL, FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE)"))
        connection.execute(text("CREATE TABLE marina_memories (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, role VARCHAR(16) NOT NULL, content TEXT NOT NULL, emotion VARCHAR(24) NOT NULL, created_at DATETIME NOT NULL, FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE)"))
        connection.execute(text("CREATE INDEX ix_marina_memories_user_id ON marina_memories (user_id)"))
    sync_engine.dispose()

    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite+aiosqlite:///{database_path}"
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=Path(__file__).resolve().parents[1],
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0
    verify_engine = create_engine(f"sqlite:///{database_path}")
    inspector = inspect(verify_engine)
    assert "idempotency_records" in inspector.get_table_names()
    assert "request_fingerprint" in {column["name"] for column in inspector.get_columns("idempotency_records")}
    with verify_engine.connect() as connection:
        version = connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
    verify_engine.dispose()
    assert version == "20260722_0001"
