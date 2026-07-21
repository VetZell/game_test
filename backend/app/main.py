from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Day Marina API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PlayerState(BaseModel):
    day: int = 1
    period: str = "morning"
    love: int = 78
    mood: int = 64
    energy: int = 53
    hunger: int = 72
    calm: int = 68
    coins: int = 1250
    crystals: int = 25


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/state", response_model=PlayerState)
def get_state() -> PlayerState:
    return PlayerState()
