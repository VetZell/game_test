from pathlib import Path


def test_fastapi_lifespan_does_not_run_create_all():
    source = Path("app/main.py").read_text()
    assert "create_all" not in source


def test_alembic_baseline_exists_for_current_tables():
    migration = Path("alembic/versions/20260722_0001_baseline.py").read_text()
    for table in ("users", "marina_states", "marina_memories", "idempotency_records"):
        assert table in migration
