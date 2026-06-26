import enum
from datetime import datetime
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class AgentStatus(str, enum.Enum):
    IDLE = "idle"
    THINKING = "thinking"
    CODING = "coding"
    TESTING = "testing"
    REVIEWING = "reviewing"
    ERROR = "error"


class TaskStatus(str, enum.Enum):
    BACKLOG = "backlog"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    role: Mapped[str] = mapped_column(String(120))
    personality_prompt: Mapped[str] = mapped_column(Text, default="")
    system_instructions: Mapped[str] = mapped_column(Text, default="")
    avatar_url: Mapped[str] = mapped_column(String(500), default="")
    room: Mapped[str] = mapped_column(String(40), default="dev_lab")
    status: Mapped[AgentStatus] = mapped_column(
        Enum(AgentStatus), default=AgentStatus.IDLE
    )
    status_detail: Mapped[str] = mapped_column(String(200), default="")

    tasks: Mapped[list["Task"]] = relationship(back_populates="agent")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus), default=TaskStatus.BACKLOG
    )
    assigned_agent_id: Mapped[int | None] = mapped_column(
        ForeignKey("agents.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    agent: Mapped["Agent | None"] = relationship(back_populates="tasks")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    agent_id: Mapped[int | None] = mapped_column(ForeignKey("agents.id"), nullable=True)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    log_type: Mapped[str] = mapped_column(String(20), default="info")  # info/tool/llm/error/handoff
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    agent_id: Mapped[int | None] = mapped_column(ForeignKey("agents.id"), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="agent")  # system/agent/user
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
