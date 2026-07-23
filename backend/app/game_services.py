from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import MarinaMemory, User
from .personality import RECENT_MEMORY_LIMIT, build_personality_reply
from .schemas import GameActionResponse, MarinaChatResponse, PlayerResponse


def clamp(value: int) -> int:
    return max(0, min(100, value))



async def apply_chat_message(*, session: AsyncSession, user: User, message: str) -> MarinaChatResponse:
    recent_memories = (await session.scalars(
        select(MarinaMemory)
        .where(MarinaMemory.user_id == user.id)
        .order_by(MarinaMemory.id.desc())
        .limit(RECENT_MEMORY_LIMIT)
    )).all()
    decision = build_personality_reply(message=message, user=user, memories=list(recent_memories))

    marina = user.marina
    marina.love = clamp(marina.love + decision.changes["love"])
    marina.mood = clamp(marina.mood + decision.changes["mood"])
    marina.trust = clamp(marina.trust + decision.changes["trust"])
    marina.calm = clamp(marina.calm + decision.changes["calm"])
    user.experience += 2

    session.add_all([
        MarinaMemory(user_id=user.id, role="user", content=message, emotion="player"),
        MarinaMemory(user_id=user.id, role="marina", content=decision.reply, emotion=decision.emotion),
    ])
    await session.flush()

    return MarinaChatResponse(
        reply=decision.reply,
        emotion=decision.emotion,
        remembered=decision.remembered,
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
