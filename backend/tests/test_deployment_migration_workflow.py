from pathlib import Path


ROOT_DOCKERFILE = Path("../Dockerfile")
BACKEND_DOCKERFILE = Path("Dockerfile")
MIGRATION_SCRIPT = Path("scripts/migrate.sh")


def _read(path: Path) -> str:
    return path.read_text()


def test_root_backend_image_includes_alembic_assets_and_migration_script():
    dockerfile = _read(ROOT_DOCKERFILE)
    assert "COPY backend/alembic.ini ./alembic.ini" in dockerfile
    assert "COPY backend/alembic ./alembic" in dockerfile
    assert "COPY backend/scripts ./scripts" in dockerfile


def test_backend_root_directory_image_includes_alembic_assets_and_migration_script():
    dockerfile = _read(BACKEND_DOCKERFILE)
    assert "COPY alembic.ini ./alembic.ini" in dockerfile
    assert "COPY alembic ./alembic" in dockerfile
    assert "COPY scripts ./scripts" in dockerfile


def test_migration_command_is_explicit_upgrade_only_and_preserves_exit_code():
    script = _read(MIGRATION_SCRIPT)
    assert "DATABASE_URL" in script
    assert "alembic upgrade head" in script
    assert "exec alembic upgrade head" in script
    assert "downgrade" not in script
    assert "set -eu" in script


def test_api_startup_commands_do_not_run_hidden_migrations():
    for path in (ROOT_DOCKERFILE, BACKEND_DOCKERFILE):
        dockerfile = _read(path)
        cmd_lines = [line for line in dockerfile.splitlines() if line.startswith("CMD ")]
        assert cmd_lines == [
            'CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]'
        ]
        assert all("alembic" not in line for line in cmd_lines)
