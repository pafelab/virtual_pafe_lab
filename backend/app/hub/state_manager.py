from dataclasses import dataclass, field
from app.models import AgentStatus
from app.hub.ws_broker import WebSocketBroker


@dataclass
class AgentRuntimeState:
    agent_id: int
    name: str
    status: AgentStatus = AgentStatus.IDLE
    detail: str = ""
    progress: int = 0  # 0..100 for the avatar micro-status bar


class StateManager:
    """Single source of truth for live agent status. Broadcasts every change."""

    def __init__(self, broker: WebSocketBroker) -> None:
        self._states: dict[int, AgentRuntimeState] = {}
        self._broker = broker

    def register(self, agent_id: int, name: str) -> None:
        self._states[agent_id] = AgentRuntimeState(agent_id=agent_id, name=name)

    def snapshot(self) -> list[dict]:
        return [
            {
                "agent_id": s.agent_id,
                "name": s.name,
                "status": s.status.value,
                "detail": s.detail,
                "progress": s.progress,
            }
            for s in self._states.values()
        ]

    async def update(
        self,
        agent_id: int,
        status: AgentStatus,
        detail: str = "",
        progress: int = 0,
    ) -> None:
        state = self._states.setdefault(
            agent_id, AgentRuntimeState(agent_id=agent_id, name=f"agent-{agent_id}")
        )
        state.status = status
        state.detail = detail
        state.progress = progress
        await self._broker.broadcast(
            "agent_status",
            {
                "agent_id": agent_id,
                "name": state.name,
                "status": status.value,
                "detail": detail,
                "progress": progress,
            },
        )

    async def log(self, message: str, log_type: str = "info",
                  agent_id: int | None = None, task_id: int | None = None) -> None:
        await self._broker.broadcast(
            "activity_log",
            {"agent_id": agent_id, "task_id": task_id,
             "log_type": log_type, "message": message},
        )
