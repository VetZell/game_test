"""ensure idempotency records table

Revision ID: 20260723_0002
Revises: 20260722_0001
Create Date: 2026-07-23 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "20260723_0002"
down_revision: str | None = "20260722_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _inspector():
    return inspect(op.get_bind())


def _table_exists(table_name: str) -> bool:
    return _inspector().has_table(table_name)


def _columns(table_name: str) -> set[str]:
    if not _table_exists(table_name):
        return set()
    return {column["name"] for column in _inspector().get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    if not _table_exists(table_name):
        return set()
    return {index["name"] for index in _inspector().get_indexes(table_name)}


def _unique_constraints(table_name: str) -> set[str]:
    if not _table_exists(table_name):
        return set()
    return {constraint["name"] for constraint in _inspector().get_unique_constraints(table_name)}


def _create_idempotency_records() -> None:
    op.create_table(
        "idempotency_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("endpoint", sa.String(length=64), nullable=False),
        sa.Column("key", sa.String(length=128), nullable=False),
        sa.Column("request_fingerprint", sa.String(length=64), nullable=False),
        sa.Column("response", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "endpoint", "key", name="uq_idempotency_user_endpoint_key"),
    )
    op.create_index(op.f("ix_idempotency_records_user_id"), "idempotency_records", ["user_id"], unique=False)


def _ensure_existing_idempotency_records() -> None:
    columns = _columns("idempotency_records")
    if "request_fingerprint" not in columns:
        op.add_column(
            "idempotency_records",
            sa.Column("request_fingerprint", sa.String(length=64), nullable=False, server_default=""),
        )
        op.alter_column("idempotency_records", "request_fingerprint", server_default=None)
    if "ix_idempotency_records_user_id" not in _indexes("idempotency_records"):
        op.create_index(op.f("ix_idempotency_records_user_id"), "idempotency_records", ["user_id"], unique=False)
    if "uq_idempotency_user_endpoint_key" not in _unique_constraints("idempotency_records"):
        if op.get_bind().dialect.name == "sqlite":
            # SQLite cannot add a unique constraint in-place. Fresh SQLite databases and
            # production PostgreSQL paths create this constraint with the table; this
            # branch only keeps tests against legacy partial SQLite schemas non-destructive.
            return
        op.create_unique_constraint(
            "uq_idempotency_user_endpoint_key",
            "idempotency_records",
            ["user_id", "endpoint", "key"],
        )


def upgrade() -> None:
    if _table_exists("idempotency_records"):
        _ensure_existing_idempotency_records()
        return
    _create_idempotency_records()


def downgrade() -> None:
    raise RuntimeError(
        "Revision 20260723_0002 is irreversible because idempotency_records may contain "
        "production replay data. Restore from backup or apply a purpose-built manual "
        "migration if rollback is required."
    )
