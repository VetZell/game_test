from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    first_name: Mapped[str] = mapped_column(String(128), default="Игрок")
    level: Mapped[int] = mapped_column(Integer, default=1)
    experience: Mapped[int] = mapped_column(Integer, default=0)
    coins: Mapped[int] = mapped_column(Integer, default=1000)
    crystals: Mapped[int] = mapped_column(Integer, default=25)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    marina: Mapped["MarinaState"] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    memories: Mapped[list["MarinaMemory"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", order_by="MarinaMemory.created_at"
    )


class MarinaState(Base):
    __tablename__ = "marina_states"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    day: Mapped[int] = mapped_column(Integer, default=1)
    period: Mapped[str] = mapped_column(String(16), default="morning")
    love: Mapped[int] = mapped_column(Integer, default=50)
    mood: Mapped[int] = mapped_column(Integer, default=80)
    energy: Mapped[int] = mapped_column(Integer, default=100)
    hunger: Mapped[int] = mapped_column(Integer, default=80)
    calm: Mapped[int] = mapped_column(Integer, default=75)
    trust: Mapped[int] = mapped_column(Integer, default=50)
    attachment: Mapped[int] = mapped_column(Integer, default=40)
    romance: Mapped[int] = mapped_column(Integer, default=40)

    user: Mapped[User] = relationship(back_populates="marina")


class MarinaMemory(Base):
    __tablename__ = "marina_memories"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text)
    emotion: Mapped[str] = mapped_column(String(24), default="neutral")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="memories")
