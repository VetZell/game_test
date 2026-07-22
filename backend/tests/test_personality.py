from app.models import MarinaMemory, MarinaState, User
from app.personality import (
    MAX_MEMORY_QUOTE_LENGTH,
    build_personality_reply,
    classify_intent,
    select_relevant_memory,
)


def user_with_state(**state_values):
    user = User(telegram_id=777, username="tester", first_name="Tester")
    defaults = {
        "mood": 80,
        "trust": 75,
        "love": 78,
        "calm": 76,
        "energy": 82,
    }
    defaults.update(state_values)
    user.marina = MarinaState(**defaults)
    return user


def memory(role: str, content: str) -> MarinaMemory:
    return MarinaMemory(user_id=1, role=role, content=content, emotion="neutral")


def test_classify_intent_covers_required_categories():
    assert classify_intent("Я люблю тебя, солнышко") == "affection"
    assert classify_intent("Прости меня, я виноват") == "apology"
    assert classify_intent("Мне грустно и очень тяжело") == "support"
    assert classify_intent("Помнишь, как мы гуляли вчера?") == "memory"
    assert classify_intent("Как ты себя чувствуешь?") == "question"
    assert classify_intent("Сегодня был обычный день") == "neutral"


def test_reply_tone_differs_for_low_and_high_emotional_state():
    low_user = user_with_state(mood=20, trust=30, love=25, calm=28, energy=22)
    high_user = user_with_state(mood=90, trust=90, love=92, calm=88, energy=86)

    low = build_personality_reply(message="Я люблю тебя", user=low_user, memories=[])
    high = build_personality_reply(message="Я люблю тебя", user=high_user, memories=[])

    assert low.reply != high.reply
    assert "бережно" in low.reply
    assert "легко улыбаться" in high.reply
    assert low.emotion == high.emotion == "love"


def test_selects_relevant_user_memory_from_recent_candidates():
    memories = [
        memory("user", "Мы вместе гуляли в парке и кормили уток"),
        memory("user", "Я рассказывал про сложную работу"),
        memory("user", "Вчера мы пили кофе у окна"),
    ]

    selected = select_relevant_memory("Помнишь кофе вчера?", memories)

    assert selected == "Вчера мы пили кофе у окна"


def test_ignores_marina_and_event_memories_for_user_memory_selection():
    memories = [
        memory("marina", "Ты раньше говорил про парк"),
        memory("event", "Марина прижалась к тебе"),
        memory("user", "Мы обсуждали тихий вечер дома"),
    ]

    selected = select_relevant_memory("Помнишь вечер дома?", memories)

    assert selected == "Мы обсуждали тихий вечер дома"


def test_memory_intent_without_memory_does_not_fabricate_remembered():
    decision = build_personality_reply(message="Помнишь, что было вчера?", user=user_with_state(), memories=[])

    assert decision.remembered is None
    assert "не нашла точную прошлую деталь" in decision.reply
    assert "вчера мы" not in decision.reply.lower()


def test_limits_memory_quote_length_and_filters_service_content():
    long_content = "Мы обсуждали поездку к морю " + "очень " * 40
    memories = [
        memory("user", "telegram init_data hash secret query_id"),
        memory("user", long_content),
    ]

    selected = select_relevant_memory("Помнишь поездку к морю?", memories)

    assert selected is not None
    assert len(selected) == MAX_MEMORY_QUOTE_LENGTH
    assert "init_data" not in selected


def test_current_message_is_not_returned_as_previous_memory():
    current_text = "Помнишь наш вечер на балконе"
    memories = [memory("user", current_text)]

    decision = build_personality_reply(message=current_text, user=user_with_state(), memories=memories)

    assert decision.remembered is None
    assert current_text not in decision.reply
