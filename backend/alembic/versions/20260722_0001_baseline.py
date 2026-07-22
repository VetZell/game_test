"""baseline schema

Revision ID: 20260722_0001
Revises:
Create Date: 2026-07-22 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "20260722_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(table_name: str) -> bool:
    return inspect(op.get_bind()).has_table(table_name)


def _columns(table_name: str) -> set[str]:
    if not _table_exists(table_name):
        return set()
    return {column["name"] for column in inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    if not _table_exists(table_name):
        return set()
    return {index["name"] for index in inspect(op.get_bind()).get_indexes(table_name)}


def _constraints(table_name: str) -> set[str]:
    if not _table_exists(table_name):
        return set()
    return {constraint["name"] for constraint in inspect(op.get_bind()).get_unique_constraints(table_name)}


def _create_users() -> None:
    if _table_exists("users"):
        if "ix_users_telegram_id" not in _indexes("users"):
            op.create_index(op.f("ix_users_telegram_id"), "users", ["telegram_id"], unique=True)
        return

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("username", sa.String(length=64), nullable=True),
        sa.Column("first_name", sa.String(length=128), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("experience", sa.Integer(), nullable=False),
        sa.Column("coins", sa.Integer(), nullable=False),
        sa.Column("crystals", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_telegram_id"), "users", ["telegram_id"], unique=True)


def _create_marina_states() -> None:
    if _table_exists("marina_states"):
        return
    op.create_table(
        "marina_states",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("day", sa.Integer(), nullable=False),
        sa.Column("period", sa.String(length=16), nullable=False),
        sa.Column("love", sa.Integer(), nullable=False),
        sa.Column("mood", sa.Integer(), nullable=False),
        sa.Column("energy", sa.Integer(), nullable=False),
        sa.Column("hunger", sa.Integer(), nullable=False),
        sa.Column("calm", sa.Integer(), nullable=False),
        sa.Column("trust", sa.Integer(), nullable=False),
        sa.Column("attachment", sa.Integer(), nullable=False),
        sa.Column("romance", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )


def _create_marina_memories() -> None:
    if _table_exists("marina_memories"):
        if "ix_marina_memories_user_id" not in _indexes("marina_memories"):
            op.create_index(op.f("ix_marina_memories_user_id"), "marina_memories", ["user_id"], unique=False)
        return
    op.create_table(
        "marina_memories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("emotion", sa.String(length=24), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_marina_memories_user_id"), "marina_memories", ["user_id"], unique=False)


def _create_or_update_idempotency_records() -> None:
    if not _table_exists("idempotency_records"):
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
        return

    if "request_fingerprint" not in _columns("idempotency_records"):
        op.add_column(
            "idempotency_records",
            sa.Column("request_fingerprint", sa.String(length=64), nullable=False, server_default=""),
        )
        op.alter_column("idempotency_records", "request_fingerprint", server_default=None)
    if "ix_idempotency_records_user_id" not in _indexes("idempotency_records"):
        op.create_index(op.f("ix_idempotency_records_user_id"), "idempotency_records", ["user_id"], unique=False)
    if "uq_idempotency_user_endpoint_key" not in _constraints("idempotency_records"):
        op.create_unique_constraint(
            "uq_idempotency_user_endpoint_key",
            "idempotency_records",
            ["user_id", "endpoint", "key"],
        )


def upgrade() -> None:
    _create_users()
    _create_marina_states()
    _create_marina_memories()
    _create_or_update_idempotency_records()


def downgrade() -> None:
    if _table_exists("idempotency_records"):
        if "ix_idempotency_records_user_id" in _indexes("idempotency_records"):
            op.drop_index(op.f("ix_idempotency_records_user_id"), table_name="idempotency_records")
        op.drop_table("idempotency_records")
    if _table_exists("marina_memories"):
        if "ix_marina_memories_user_id" in _indexes("marina_memories"):
            op.drop_index(op.f("ix_marina_memories_user_id"), table_name="marina_memories")
        op.drop_table("marina_memories")
    if _table_exists("marina_states"):
        op.drop_table("marina_states")
    if _table_exists("users"):
        if "ix_users_telegram_id" in _indexes("users"):
            op.drop_index(op.f("ix_users_telegram_id"), table_name="users")
        op.drop_table("users")
