import types
import pytest
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.agents import orchestrator
from app.agents.persona import AgentConfig
from app.tools.file_sandbox import FileSandbox
from app.tools.terminal import SafeTerminal


class FakeChat:
    """Deterministic stand-in for ChatGoogleGenerativeAI.

    - As supervisor (single 'ONLY JSON' HumanMessage): route FE → QA → FINISH,
      driven by handoff markers already present in the transcript.
    - As worker (messages start with a SystemMessage): emit one tool call, then
      a final handoff message once the ToolMessage is observed.
    """

    def bind_tools(self, tools):
        return self

    async def ainvoke(self, messages):
        first = messages[0]

        # --- Supervisor routing ---
        if isinstance(first, HumanMessage) and "ONLY JSON" in first.content:
            transcript = first.content
            if "[FE-DONE]" not in transcript:
                return AIMessage(content='{"next": "frontend", "reason": "build it"}')
            if "[QA-DONE]" not in transcript:
                return AIMessage(content='{"next": "qa", "reason": "verify it"}')
            return AIMessage(content='{"next": "FINISH", "reason": "shipped"}')

        # --- Worker behaviour ---
        sys_text = first.content if isinstance(first, SystemMessage) else ""
        has_tool_result = any(isinstance(m, ToolMessage) for m in messages)

        if "Frontend" in sys_text:
            if not has_tool_result:
                return AIMessage(content="", tool_calls=[{
                    "name": "write_file",
                    "args": {"path": "login.py", "content": "def login():\n    return 'ok'\n"},
                    "id": "fe1",
                }])
            return AIMessage(content="Implemented login. HANDOFF [FE-DONE]")

        if "QA" in sys_text:
            if not has_tool_result:
                return AIMessage(content="", tool_calls=[{
                    "name": "run_command", "args": {"command": "ls"}, "id": "qa1",
                }])
            return AIMessage(content="Ran checks, looks good. HANDOFF [QA-DONE]")

        return AIMessage(content="(noop)")


@pytest.mark.asyncio
async def test_supervisor_drives_dev_then_qa_then_finish(tmp_project, monkeypatch):
    monkeypatch.setattr(orchestrator, "get_chat_model", lambda *a, **k: FakeChat())

    workers = {
        "frontend": AgentConfig(key="frontend", agent_id=1, name="Anya",
                                role="Frontend Developer", personality="ships fast",
                                instructions="React + Vite"),
        "qa": AgentConfig(key="qa", agent_id=2, name="Ben", role="QA Engineer",
                          personality="meticulous", instructions="writes Pytest"),
    }
    sandbox = FileSandbox(tmp_project)
    terminal = SafeTerminal(tmp_project)
    task = types.SimpleNamespace(id=1, title="Add login endpoint",
                                 description="Create login.py and verify")

    final = await orchestrator.run_orchestration(workers, sandbox, terminal, task)

    # The frontend agent actually wrote the file through the real sandbox tool.
    assert (tmp_project / "login.py").exists()
    # Both agents contributed and the loop reached FINISH within the cap.
    joined = " ".join(m.content for m in final["messages"])
    assert "[FE-DONE]" in joined
    assert "[QA-DONE]" in joined
    assert final["iterations"] >= 2


def test_route_parser_handles_garbage():
    assert orchestrator._parse_route("not json", {"a", "FINISH"}) == ("FINISH", "unparseable routing response")
    nxt, _ = orchestrator._parse_route('prefix {"next": "a", "reason": "go"} suffix', {"a", "FINISH"})
    assert nxt == "a"
    # An unknown worker key is coerced to FINISH (defensive routing).
    nxt2, _ = orchestrator._parse_route('{"next": "ghost"}', {"a", "FINISH"})
    assert nxt2 == "FINISH"


def test_supervisor_finishes_when_iterations_exhausted(monkeypatch):
    # Build just the supervisor node and feed it a maxed-out iteration count.
    import asyncio
    from app.config import settings
    monkeypatch.setattr(orchestrator, "get_chat_model", lambda *a, **k: FakeChat())

    node = orchestrator._build_supervisor_node({"a": {}})
    state = {"messages": [HumanMessage(content="task")], "task_id": 1,
    "next_agent": "", "iterations": settings.max_orchestration_iterations}
    out = asyncio.run(node(state))
    assert out["next_agent"] == "FINISH"