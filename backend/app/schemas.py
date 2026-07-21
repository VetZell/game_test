from pydantic import BaseModel, ConfigDict, Field


class PlayerCreate(BaseModel):
    telegram_id: int
    username: str | None = None
    first_name: str = Field(default="Игрок", max_length=128)


class MarinaStateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    day: int
    period: str
    love: int
    mood: int
    energy: int
    hunger: int
    calm: int
    trust: int
    attachment: int
    romance: int


class PlayerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    telegram_id: int
    username: str | None
    first_name: str
    level: int
    experience: int
    coins: int
    crystals: int
    marina: MarinaStateResponse
