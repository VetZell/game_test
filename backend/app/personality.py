from dataclasses import dataclass
import re

from .models import MarinaMemory, MarinaState, User

LOVE_WORDS = ("люблю", "любим", "любов", "нежн", "милая", "солнышко", "красивая", "обнима")
APOLOGY_WORDS = ("прости", "извини", "виноват", "помир", "мириться")
SUPPORT_WORDS = ("груст", "плохо", "устал", "тяжело", "поддерж", "одинок", "сложно")
MEMORY_WORDS = ("помнишь", "раньше", "вчера", "прошл", "вспомни", "вспомина")
QUESTION_WORDS = ("?", "как", "что", "почему", "зачем", "когда", "где", "можно", "хочешь")

SERVICE_WORDS = {"init_data", "idempotency", "telegram", "hash", "auth_date", "query_id"}
MIN_MEMORY_LENGTH = 8
MAX_MEMORY_QUOTE_LENGTH = 120
RECENT_MEMORY_LIMIT = 8


@dataclass(frozen=True)
class ChatPersonalityDecision:
    reply: str
    emotion: str
    remembered: str | None
    changes: dict[str, int]


def normalize_text(value: str) -> str:
    return " ".join(value.lower().strip().split())


def classify_intent(message: str) -> str:
    value = normalize_text(message)
    if any(word in value for word in LOVE_WORDS):
        return "affection"
    if any(word in value for word in APOLOGY_WORDS):
        return "apology"
    if any(word in value for word in SUPPORT_WORDS):
        return "support"
    if any(word in value for word in MEMORY_WORDS):
        return "memory"
    if "?" in message or any(re.search(rf"\b{re.escape(word)}\b", value) for word in QUESTION_WORDS if word != "?"):
        return "question"
    return "neutral"


def emotional_tone(marina: MarinaState) -> str:
    low_values = sum(
        value <= 35
        for value in (marina.mood, marina.trust, marina.love, marina.calm, marina.energy)
    )
    high_values = sum(
        value >= 70
        for value in (marina.mood, marina.trust, marina.love, marina.calm, marina.energy)
    )
    if low_values >= 2 or marina.energy <= 25:
        return "fragile"
    if high_values >= 3:
        return "warm"
    return "steady"


def _tokens(value: str) -> set[str]:
    return {token for token in re.findall(r"[a-zа-яё0-9]+", normalize_text(value)) if len(token) >= 4}


def _safe_memory_content(content: str) -> str | None:
    normalized = " ".join(content.split())
    if len(normalized) < MIN_MEMORY_LENGTH:
        return None
    lowered = normalized.lower()
    if any(word in lowered for word in SERVICE_WORDS):
        return None
    return normalized[:MAX_MEMORY_QUOTE_LENGTH]


def select_relevant_memory(message: str, memories: list[MarinaMemory]) -> str | None:
    current = normalize_text(message)
    intent = classify_intent(message)
    message_tokens = _tokens(message)
    candidates: list[tuple[int, int, str]] = []

    for index, memory in enumerate(memories[:RECENT_MEMORY_LIMIT]):
        if memory.role != "user":
            continue
        content = _safe_memory_content(memory.content)
        if content is None:
            continue
        if normalize_text(content) == current:
            continue

        memory_tokens = _tokens(content)
        overlap = len(message_tokens & memory_tokens)
        if intent == "memory":
            score = 10 + overlap
        elif overlap > 0:
            score = overlap
        else:
            continue
        candidates.append((score, -index, content))

    if not candidates:
        return None
    return max(candidates)[2]


def build_personality_reply(*, message: str, user: User, memories: list[MarinaMemory]) -> ChatPersonalityDecision:
    marina = user.marina
    intent = classify_intent(message)
    tone = emotional_tone(marina)
    remembered = select_relevant_memory(message, memories)
    name = user.first_name or "ты"

    changes = {"love": 0, "mood": 0, "trust": 0, "calm": 0}

    if intent == "affection":
        changes.update(love=4, mood=3, trust=1)
        if tone == "fragile":
            reply = f"Я слышу это особенно бережно, {name}. Мне сейчас нужно чуть больше тишины, но твоя нежность очень греет ❤️"
        elif tone == "warm":
            reply = f"Я тоже тебя люблю, {name} ❤️ Рядом с тобой мне легко улыбаться и верить в наш день."
        else:
            reply = f"Я тоже тебя люблю, {name} ❤️ Мне очень тепло от твоих слов."
        return ChatPersonalityDecision(reply, "love", remembered, changes)

    if intent == "apology":
        changes.update(trust=3, calm=3, mood=1)
        reply = "Спасибо, что сказал это честно. Мне важно, что мы можем спокойно всё обсудить и снова стать ближе."
        return ChatPersonalityDecision(reply, "thoughtful", remembered, changes)

    if intent == "support":
        changes.update(love=2, trust=2, calm=2)
        if tone == "fragile":
            reply = "Я рядом. Давай без спешки: вдохнём, выдохнем и разберём всё маленькими шагами."
        elif tone == "warm":
            reply = "Иди ко мне. Я обниму тебя словами, а потом мы вместе найдём, что сделает день легче."
        else:
            reply = "Иди ко мне. Расскажи всё как есть — я рядом и никуда не тороплюсь."
        return ChatPersonalityDecision(reply, "caring", remembered, changes)

    if intent == "memory":
        changes.update(trust=2, mood=1)
        if remembered:
            reply = f"Помню. Ты раньше говорил: «{remembered}». Мне дорого, что у нас есть такие маленькие общие истории."
        else:
            reply = "Я хочу помнить наши важные моменты, но сейчас не нашла точную прошлую деталь. Расскажи мне её ещё раз?"
        return ChatPersonalityDecision(reply, "thoughtful", remembered, changes)

    if intent == "question":
        changes.update(trust=1, mood=1)
        if tone == "fragile":
            reply = "Я отвечу мягко: давай выберем самый спокойный вариант и не будем давить друг на друга."
        elif tone == "warm":
            reply = "Мне нравится, что ты спрашиваешь. Давай решим вместе — с тобой мне хочется быть честной и смелой."
        else:
            reply = "Я думаю, нам лучше решить это вместе. Скажи, как ты сам этого хочешь?"
        return ChatPersonalityDecision(reply, "neutral", remembered, changes)

    changes.update(trust=1, mood=1)
    if remembered:
        reply = f"Я тебя услышала. И помню: «{remembered}». Расскажи, как это связано с тем, что ты чувствуешь сейчас?"
        emotion = "thoughtful"
    elif tone == "fragile":
        reply = "Я тебя услышала. Давай поговорим спокойно и бережно, мне сейчас важна мягкость."
        emotion = "thoughtful"
    else:
        reply = "Я тебя услышала. Мне нравится, когда ты говоришь со мной открыто. Расскажи ещё."
        emotion = "smile"
    return ChatPersonalityDecision(reply, emotion, remembered, changes)
