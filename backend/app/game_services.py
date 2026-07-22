from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import MarinaMemory, User
from .schemas import GameActionResponse, MarinaChatResponse, PlayerResponse


def clamp(value: int) -> int:
    return max(0, min(100, value))


def build_marina_reply(message: str, user: User, remembered: str | None) -> tuple[str, str, dict[str, int]]:
    value = message.lower().strip()
    name = user.first_name or "ты"
    changes = {"love": 0, "mood": 0, "trust": 0, "calm": 0}

    if any(word in value for word in ("люблю", "любим", "солнышко", "красивая")):
        changes.update(love=4, mood=3, trust=1)
        return f"Я тоже тебя люблю, {name} ❤️ Мне очень тепло от твоих слов.", "love", changes
    if any(word in value for word in ("прости", "извини", "виноват")):
        changes.update(trust=3, calm=3, mood=1)
        return "Спасибо, что сказал это честно. Мне важно, что мы можем спокойно всё обсудить.", "thoughtful", changes
    if any(word in value for word in ("груст", "плохо", "устал", "тяжело")):
        changes.update(love=2, trust=2, calm=2)
        return "Иди ко мне. Расскажи всё как есть — я рядом и никуда не тороплюсь.", "caring", changes
    if "кофе" in value:
        changes.update(mood=2, love=1)
        return "С тобой — обязательно ☕ Только давай посидим рядом и никуда не спешить.", "smile", changes
    if any(word in value for word in ("помнишь", "вчера", "раньше")) and remembered:
        changes.update(trust=2, mood=1)
        return f"Помню. Ты раньше говорил: «{remembered[:120]}». Для меня это не просто слова.", "thoughtful", changes
    if "?" in message:
        changes.update(trust=1, mood=1)
        return "Я думаю, нам лучше решить это вместе. Скажи, как ты сам этого хочешь?", "neutral", changes

    changes.update(trust=1, mood=1)
    return "Я тебя услышала. Мне нравится, когда ты говоришь со мной открыто. Расскажи ещё.", "smile", changes


async def apply_chat_message(*, session: AsyncSession, user: User, message: str) -> MarinaChatResponse:
    previous = await session.scalar(
        select(MarinaMemory)
        .where(MarinaMemory.user_id == user.id, MarinaMemory.role == "user")
        .order_by(MarinaMemory.created_at.desc())
        .limit(1)
    )
    remembered = previous.content if previous else None
    reply, emotion, changes = build_marina_reply(message, user, remembered)

    marina = user.marina
    marina.love = clamp(marina.love + changes["love"])
    marina.mood = clamp(marina.mood + changes["mood"])
    marina.trust = clamp(marina.trust + changes["trust"])
    marina.calm = clamp(marina.calm + changes["calm"])
    user.experience += 2

    session.add_all([
        MarinaMemory(user_id=user.id, role="user", content=message, emotion="player"),
        MarinaMemory(user_id=user.id, role="marina", content=reply, emotion=emotion),
    ])
    await session.flush()

    return MarinaChatResponse(
        reply=reply,
        emotion=emotion,
        remembered=remembered,
        player=PlayerResponse.model_validate(user),
    )


ACTION_MESSAGES = {
    "hug": "Марина прижалась к тебе и улыбнулась ❤️",
    "coffee": "Спасибо! Такой кофе — идеальное начало утра ☕",
    "breakfast": "Как вкусно! Теперь я сытая и счастливая 🥞",
    "kind_words": "Ты умеешь говорить именно то, что мне нужно услышать 💌",
    "walk": "Свежий воздух пошёл нам на пользу. Мне стало спокойнее 🌿",
    "movie": "Давай устроимся поудобнее и посмотрим что-нибудь вместе 🎬",
    "talk": "Мне стало намного легче после нашего разговора.",
}


def apply_action_state(user: User, action: str) -> str | None:
    marina = user.marina
    if action == "hug":
        marina.love = clamp(marina.love + 8)
        marina.attachment = clamp(marina.attachment + 4)
        marina.mood = clamp(marina.mood + 3)
        user.experience += 5
    elif action == "coffee":
        marina.energy = clamp(marina.energy + 10)
        marina.mood = clamp(marina.mood + 5)
        user.coins = max(0, user.coins - 15)
        user.experience += 4
    elif action == "breakfast":
        marina.hunger = clamp(marina.hunger + 15)
        marina.love = clamp(marina.love + 5)
        user.coins = max(0, user.coins - 25)
        user.experience += 6
    elif action == "kind_words":
        marina.love = clamp(marina.love + 10)
        marina.mood = clamp(marina.mood + 10)
        marina.trust = clamp(marina.trust + 3)
        user.experience += 7
    elif action == "walk":
        marina.energy = clamp(marina.energy + 15)
        marina.calm = clamp(marina.calm + 5)
        marina.mood = clamp(marina.mood + 4)
        user.experience += 7
    elif action == "movie":
        marina.mood = clamp(marina.mood + 10)
        marina.calm = clamp(marina.calm + 5)
        marina.attachment = clamp(marina.attachment + 2)
        user.coins = max(0, user.coins - 20)
        user.experience += 6
    elif action == "talk":
        marina.mood = clamp(marina.mood + 10)
        marina.trust = clamp(marina.trust + 5)
        marina.calm = clamp(marina.calm + 4)
        user.experience += 6
    else:
        return None
    return ACTION_MESSAGES[action]


async def apply_game_action(*, session: AsyncSession, user: User, action: str) -> GameActionResponse | None:
    message = apply_action_state(user, action)
    if message is None:
        return None

    session.add(MarinaMemory(user_id=user.id, role="event", content=message, emotion="event"))
    await session.flush()

    return GameActionResponse(
        message=message,
        player=PlayerResponse.model_validate(user),
    )
