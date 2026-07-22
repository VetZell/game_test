import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect, text

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def create_pre_alembic_schema(database_path: Path, *, with_user_data: bool = False) -> None:
    sync_engine = create_engine(f"sqlite:///{database_path}")
    with sync_engine.begin() as connection:
        connection.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY, telegram_id BIGINT NOT NULL UNIQUE, username VARCHAR(64), first_name VARCHAR(128) NOT NULL, level INTEGER NOT NULL, experience INTEGER NOT NULL, coins INTEGER NOT NULL, crystals INTEGER NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL)"))
        connection.execute(text("CREATE INDEX ix_users_telegram_id ON users (telegram_id)"))
        connection.execute(text("CREATE TABLE marina_states (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL UNIQUE, day INTEGER NOT NULL, period VARCHAR(16) NOT NULL, love INTEGER NOT NULL, mood INTEGER NOT NULL, energy INTEGER NOT NULL, hunger INTEGER NOT NULL, calm INTEGER NOT NULL, trust INTEGER NOT NULL, attachment INTEGER NOT NULL, romance INTEGER NOT NULL, FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE)"))
        connection.execute(text("CREATE TABLE marina_memories (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, role VARCHAR(16) NOT NULL, content TEXT NOT NULL, emotion VARCHAR(24) NOT NULL, created_at DATETIME NOT NULL, FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE)"))
        connection.execute(text("CREATE INDEX ix_marina_memories_user_id ON marina_memories (user_id)"))
        if with_user_data:
            connection.execute(
                text("INSERT INTO users (id, telegram_id, username, first_name, level, experience, coins, crystals, created_at, updated_at) VALUES (1, 1001, 'legacy', 'Legacy Player', 3, 42, 777, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")
            )
            connection.execute(
                text("INSERT INTO marina_states (id, user_id, day, period, love, mood, energy, hunger, calm, trust, attachment, romance) VALUES (1, 1, 5, 'morning', 60, 70, 80, 90, 55, 65, 45, 35)")
            )
            connection.execute(
                text("INSERT INTO marina_memories (id, user_id, role, content, emotion, created_at) VALUES (1, 1, 'user', 'pre alembic memory', 'player', CURRENT_TIMESTAMP)")
            )
    sync_engine.dispose()


def run_alembic(database_path: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite+aiosqlite:///{database_path}"
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=BACKEND_ROOT,
        env=env,
        check=check,
        capture_output=True,
        text=True,
    )


def test_alembic_upgrade_handles_existing_create_all_schema(tmp_path):
    database_path = tmp_path / "existing.sqlite"
    create_pre_alembic_schema(database_path)

    result = run_alembic(database_path, "upgrade", "head")

    assert result.returncode == 0
    verify_engine = create_engine(f"sqlite:///{database_path}")
    inspector = inspect(verify_engine)
    assert "idempotency_records" in inspector.get_table_names()
    assert "request_fingerprint" in {column["name"] for column in inspector.get_columns("idempotency_records")}
    with verify_engine.connect() as connection:
        version = connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
    verify_engine.dispose()
    assert version == "20260722_0001"


def test_alembic_downgrade_base_does_not_delete_existing_schema_or_user_data(tmp_path):
    database_path = tmp_path / "existing-with-data.sqlite"
    create_pre_alembic_schema(database_path, with_user_data=True)
    run_alembic(database_path, "upgrade", "head")

    result = run_alembic(database_path, "downgrade", "base", check=False)

    assert result.returncode != 0
    assert "Baseline revision 20260722_0001 is irreversible" in result.stderr

    verify_engine = create_engine(f"sqlite:///{database_path}")
    inspector = inspect(verify_engine)
    assert {"users", "marina_states", "marina_memories"}.issubset(inspector.get_table_names())
    with verify_engine.connect() as connection:
        user = connection.execute(
            text("SELECT telegram_id, username, first_name, experience, coins FROM users WHERE id = 1")
        ).one()
        memory = connection.execute(text("SELECT content FROM marina_memories WHERE id = 1")).scalar_one()
    verify_engine.dispose()

    assert user == (1001, "legacy", "Legacy Player", 42, 777)
    assert memory == "pre alembic memory"
