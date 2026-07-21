import hashlib
import hmac
import json
import os
import time
from dataclasses import dataclass
from urllib.parse import parse_qsl


class TelegramAuthError(ValueError):
    pass


@dataclass(slots=True)
class TelegramUser:
    id: int
    first_name: str | None = None
    username: str | None = None


def validate_init_data(init_data: str, max_age_seconds: int = 3600) -> TelegramUser:
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        raise TelegramAuthError("TELEGRAM_BOT_TOKEN is not configured")

    values = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = values.pop("hash", None)
    if not received_hash:
        raise TelegramAuthError("Telegram hash is missing")

    auth_date_raw = values.get("auth_date")
    if not auth_date_raw:
        raise TelegramAuthError("Telegram auth_date is missing")

    try:
        auth_date = int(auth_date_raw)
    except ValueError as exc:
        raise TelegramAuthError("Invalid Telegram auth_date") from exc

    now = int(time.time())
    if auth_date > now + 30 or now - auth_date > max_age_seconds:
        raise TelegramAuthError("Telegram authorization data has expired")

    data_check_string = "\n".join(
        f"{key}={value}" for key, value in sorted(values.items())
    )
    secret_key = hmac.new(
        b"WebAppData",
        bot_token.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise TelegramAuthError("Invalid Telegram signature")

    user_raw = values.get("user")
    if not user_raw:
        raise TelegramAuthError("Telegram user is missing")

    try:
        user_data = json.loads(user_raw)
        return TelegramUser(
            id=int(user_data["id"]),
            first_name=user_data.get("first_name"),
            username=user_data.get("username"),
        )
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise TelegramAuthError("Invalid Telegram user data") from exc
