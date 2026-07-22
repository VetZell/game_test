import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import Base
from app.game_services import ACTION_MESSAGES, apply_chat_message, apply_game_action
from app.models import MarinaMemory, MarinaState, User


@pytest_asyncio.fixture
async def session_with_user():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        user = User(telegram_id=100, username="tester", first_name="Tester")
        user.marina = MarinaState()
        session.add(user)
        await session.commit()
        await session.refresh(user, ["marina"])
        yield session, user

    await engine.dispose()


@pytest.mark.asyncio
async def test_apply_chat_message_updates_state_and_creates_memories(session_with_user):
    session, user = session_with_user

    response = await apply_chat_message(session=session, user=user, message="Я люблю тебя")

    memories = (await session.scalars(select(MarinaMemory).order_by(MarinaMemory.id))).all()
    assert response.reply == "Я тоже тебя люблю, Tester ❤️ Мне очень тепло от твоих слов."
    assert response.emotion == "love"
    assert response.remembered is None
    assert response.player.experience == 2
    assert response.player.marina.love == 54
    assert response.player.marina.mood == 83
    assert response.player.marina.trust == 51
    assert response.player.marina.calm == 75
    assert [(memory.role, memory.content, memory.emotion) for memory in memories] == [
        ("user", "Я люблю тебя", "player"),
        ("marina", "Я тоже тебя люблю, Tester ❤️ Мне очень тепло от твоих слов.", "love"),
    ]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("action", "expected"),
    [
        ("hug", {"experience": 5, "coins": 1000, "love": 58, "mood": 83, "energy": 100, "hunger": 80, "calm": 75, "trust": 50, "attachment": 44}),
        ("coffee", {"experience": 4, "coins": 985, "love": 50, "mood": 85, "energy": 100, "hunger": 80, "calm": 75, "trust": 50, "attachment": 40}),
        ("breakfast", {"experience": 6, "coins": 975, "love": 55, "mood": 80, "energy": 100, "hunger": 95, "calm": 75, "trust": 50, "attachment": 40}),
        ("kind_words", {"experience": 7, "coins": 1000, "love": 60, "mood": 90, "energy": 100, "hunger": 80, "calm": 75, "trust": 53, "attachment": 40}),
        ("walk", {"experience": 7, "coins": 1000, "love": 50, "mood": 84, "energy": 100, "hunger": 80, "calm": 80, "trust": 50, "attachment": 40}),
        ("movie", {"experience": 6, "coins": 980, "love": 50, "mood": 90, "energy": 100, "hunger": 80, "calm": 80, "trust": 50, "attachment": 42}),
        ("talk", {"experience": 6, "coins": 1000, "love": 50, "mood": 90, "energy": 100, "hunger": 80, "calm": 79, "trust": 55, "attachment": 40}),
    ],
)
async def test_apply_game_action_preserves_all_action_state_changes_and_event_memory(action, expected, session_with_user):
    session, user = session_with_user

    response = await apply_game_action(session=session, user=user, action=action)

    event = await session.scalar(select(MarinaMemory).where(MarinaMemory.role == "event"))
    assert response is not None
    assert response.message == ACTION_MESSAGES[action]
    assert response.player.experience == expected["experience"]
    assert response.player.coins == expected["coins"]
    assert response.player.marina.love == expected["love"]
    assert response.player.marina.mood == expected["mood"]
    assert response.player.marina.energy == expected["energy"]
    assert response.player.marina.hunger == expected["hunger"]
    assert response.player.marina.calm == expected["calm"]
    assert response.player.marina.trust == expected["trust"]
    assert response.player.marina.attachment == expected["attachment"]
    assert event is not None
    assert (event.content, event.emotion) == (ACTION_MESSAGES[action], "event")


@pytest.mark.asyncio
async def test_apply_game_action_returns_none_for_unknown_action(session_with_user):
    session, user = session_with_user

    response = await apply_game_action(session=session, user=user, action="unknown")
    memories = (await session.scalars(select(MarinaMemory))).all()

    assert response is None
    assert user.experience == 0
    assert memories == []
