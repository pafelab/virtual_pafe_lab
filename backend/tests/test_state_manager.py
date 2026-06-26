import pytest
from app.hub.state_manager import StateManager
from app.models import AgentStatus


class FakeBroker:
    def __init__(self):
        self.events = []

    async def broadcast(self, event_type, payload):
        self.events.append((event_type, payload))


@pytest.mark.asyncio
async def test_update_mutates_state_and_broadcasts():
    broker = FakeBroker()
    hub = StateManager(broker)
    hub.register(1, "Anya")

    await hub.update(1, AgentStatus.CODING, "Writing login.py", progress=60)

    snap = {s["agent_id"]: s for s in hub.snapshot()}
    assert snap[1]["status"] == "coding"
    assert snap[1]["progress"] == 60
    assert broker.events[-1][0] == "agent_status"
    assert broker.events[-1][1]["detail"] == "Writing login.py"


@pytest.mark.asyncio
async def test_log_broadcasts_activity():
    broker = FakeBroker()
    hub = StateManager(broker)
    await hub.log("supervisor → qa_engineer", log_type="info", task_id=7)
    assert broker.events[-1][0] == "activity_log"
    assert broker.events[-1][1]["task_id"] == 7