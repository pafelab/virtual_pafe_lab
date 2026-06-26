from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models import AgentStatus, TaskStatus


class AgentCreate(BaseModel):
    name: str
    role: str
    personality_prompt: str = ""
    system_instructions: str = ""
    avatar_url: str = ""
    room: str = "dev_lab"


class AgentOut(AgentCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: AgentStatus
    status_detail: str


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    assigned_agent_id: int | None = None


class TaskMove(BaseModel):
    status: TaskStatus


class TaskOut(TaskCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: TaskStatus
    created_at: datetime


class ActivityLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    agent_id: int | None
    task_id: int | None
    log_type: str
    message: str
    created_at: datetime
