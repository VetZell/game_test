from collections.abc import Awaitable, Callable
from typing import TypeVar

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .models import IdempotencyRecord, User

ResponseT = TypeVar("ResponseT", bound=BaseModel)


async def run_idempotent(
    *,
    session: AsyncSession,
    user: User,
    endpoint: str,
    key: str | None,
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
        return response_model.model_validate(existing.response)

    response = await operation()
    session.add(
        IdempotencyRecord(
            user_id=user.id,
            endpoint=endpoint,
            key=key,
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
            return response_model.model_validate(existing.response)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Idempotency key conflict; retry the request with the same payload.",
        ) from exc

    return response
