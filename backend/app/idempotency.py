from collections.abc import Awaitable, Callable
import hashlib
import json
from typing import Any, TypeVar

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .models import IdempotencyRecord, User

ResponseT = TypeVar("ResponseT", bound=BaseModel)


def request_fingerprint(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def ensure_fingerprint_matches(existing: IdempotencyRecord, fingerprint: str) -> None:
    if existing.request_fingerprint != fingerprint:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Idempotency key conflict; retry with the original payload or use a new key.",
        )


async def run_idempotent(
    *,
    session: AsyncSession,
    user: User,
    endpoint: str,
    key: str | None,
    fingerprint: str,
    response_model: type[ResponseT],
    operation: Callable[[], Awaitable[ResponseT]],
) -> ResponseT:
    if key is None:
        response = await operation()
        await session.commit()
        return response

    existing = await session.scalar(
        select(IdempotencyRecord).where(
            IdempotencyRecord.user_id == user.id,
            IdempotencyRecord.endpoint == endpoint,
            IdempotencyRecord.key == key,
        )
    )
    if existing is not None:
        ensure_fingerprint_matches(existing, fingerprint)
        return response_model.model_validate(existing.response)

    response = await operation()
    session.add(
        IdempotencyRecord(
            user_id=user.id,
            endpoint=endpoint,
            key=key,
            request_fingerprint=fingerprint,
            response=response.model_dump(mode="json"),
        )
    )
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        existing = await session.scalar(
            select(IdempotencyRecord).where(
                IdempotencyRecord.user_id == user.id,
                IdempotencyRecord.endpoint == endpoint,
                IdempotencyRecord.key == key,
            )
        )
        if existing is not None:
            ensure_fingerprint_matches(existing, fingerprint)
            return response_model.model_validate(existing.response)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Idempotency key conflict; retry the request with the same payload.",
        ) from exc

    return response
