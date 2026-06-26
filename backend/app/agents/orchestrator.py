import json
import operator
from dataclasses import dataclass
from typing import Annotated, TypedDict

from langchain_core.messages import (
    AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage,
)
from langchain_core.tools import StructuredTool
from langgraph.graph import StateGraph, END

from app.config import settings
from app.models import AgentStatus
from app.agents.persona import AgentConfig, build_system_prompt
from app.llm.gemini_client import get_chat_model
from app.tools.file_sandbox import FileSandbox
from app.tools.terminal import SafeTerminal
from app.runtime import hub


# ---- Shared graph state ------------------------------------------------------
class OfficeState(TypedDict):
    task_id: int
    task_title: str
    task_description: str
    messages: Annotated[list[BaseMessage], operator.add]
    next_agent: str
    iterations: int


# ---- Tool factory: bind tools to one sandbox/terminal ------------------------
def make_tools(sandbox: FileSandbox, terminal: SafeTerminal):
    def read_file(path: str) -> str:
        """Read a file."""
        return sandbox.read_file(path)

    def write_file(path: str, content: str) -> str:
        """Write to a file."""
        return sandbox.write_file(path, content)

    def patch_file(path: str, old: str, new: str) -> str:
        """Patch a file."""
        return sandbox.patch_file(path, old, new)

    def run_command(command: str) -> str:
        """Run a command."""
        result = terminal.run(command)
        return json.dumps(result)

    tools = [
        StructuredTool.from_function(read_file),
        StructuredTool.from_function(write_file),
        StructuredTool.from_function(patch_file),
        StructuredTool.from_function(run_command),
    ]
    tool_map = {t.name: t for t in tools}
    return tools, tool_map


# Map which tool implies which live status (for the office avatars).
_STATUS_BY_TOOL = {
    "read_file": AgentStatus.THINKING,
    "write_file": AgentStatus.CODING,
    "patch_file": AgentStatus.CODING,
    "run_command": AgentStatus.TESTING,
}


# ---- Worker node builder -----------------------------------------------------
def make_worker_node(cfg: AgentConfig, tools, tool_map, sandbox: FileSandbox,
                     max_tool_rounds: int = 4):
    model = get_chat_model().bind_tools(tools)

    async def worker(state: OfficeState) -> dict:
        await hub.update(cfg.agent_id, AgentStatus.THINKING,
                         f"{cfg.name}: picking up the task", progress=10)

        system = SystemMessage(content=build_system_prompt(cfg, sandbox.list_tree()))
        convo: list[BaseMessage] = [system, *state["messages"]]

        for _ in range(max_tool_rounds):
            ai: AIMessage = await model.ainvoke(convo)
            convo.append(ai)

            if not ai.tool_calls:
                break  # agent produced a final textual answer / handoff

            for call in ai.tool_calls:
                tool = tool_map[call["name"]]
                status = _STATUS_BY_TOOL.get(call["name"], AgentStatus.CODING)
                await hub.update(cfg.agent_id, status,
                                 f"{cfg.name}: {call['name']}({_short(call['args'])})",
                                 progress=60)
                await hub.log(f"{cfg.name} → {call['name']} {_short(call['args'])}",
                              log_type="tool", agent_id=cfg.agent_id,
                              task_id=state["task_id"])
                result = tool.invoke(call["args"])
                convo.append(ToolMessage(content=str(result),
                                         tool_call_id=call["id"]))

        final_text = convo[-1].text if convo else ""
        await hub.update(cfg.agent_id, AgentStatus.IDLE,
                         f"{cfg.name}: handed off", progress=100)
        await hub.log(f"{cfg.name}: {final_text[:300]}", log_type="handoff",
                      agent_id=cfg.agent_id, task_id=state["task_id"])

        # Append this worker's contribution to the shared transcript.
        return {"messages": [AIMessage(content=f"[{cfg.name}/{cfg.role}] {final_text}")]}

    return worker


# ---- Supervisor node ---------------------------------------------------------
def make_supervisor_node(workers: dict[str, AgentConfig]):
    model = get_chat_model(temperature=0.0)
    roster = "\n".join(f"- {k}: {c.name} ({c.role})" for k, c in workers.items())

    async def supervisor(state: OfficeState) -> dict:
        iterations = state.get("iterations", 0)
        if iterations >= settings.max_orchestration_iterations:
            return {"next_agent": "FINISH", "iterations": iterations}

        transcript = "\n\n".join(
            f"{m.type}: {m.text[:600]}" for m in state["messages"][-8:]
        )
        routing_prompt = f"""You are the office supervisor. Decide who acts next.

Task: {state['task_title']}
Details: {state['task_description']}

Available workers:
{roster}

Recent transcript:
{transcript}

Respond with ONLY JSON: {{"next": "<worker_key or FINISH>", "reason": "<short>"}}
Choose FINISH when the task is implemented AND verified (tests pass)."""

        ai = await model.ainvoke([HumanMessage(content=routing_prompt)])
        # langchain-core 1.x returns content as a list of blocks; .text gives the string.
        choice, reason = _parse_route(ai.text, valid=set(workers) | {"FINISH"})
        await hub.log(f"Supervisor → {choice} ({reason})", log_type="info",
                      task_id=state["task_id"])
        return {"next_agent": choice, "iterations": iterations + 1}

    return supervisor


# ---- Graph wiring ------------------------------------------------------------
def build_office_graph(workers: dict[str, AgentConfig], sandbox: FileSandbox,
                       terminal: SafeTerminal):
    tools, tool_map = make_tools(sandbox, terminal)

    graph = StateGraph(OfficeState)
    graph.add_node("supervisor", make_supervisor_node(workers))
    for key, cfg in workers.items():
        graph.add_node(key, make_worker_node(cfg, tools, tool_map, sandbox))

    graph.set_entry_point("supervisor")
    graph.add_conditional_edges(
        "supervisor",
        lambda s: s["next_agent"],
        {**{k: k for k in workers}, "FINISH": END},
    )
    for key in workers:
        graph.add_edge(key, "supervisor")  # every worker reports back to supervisor

    return graph.compile()


async def run_orchestration(workers: dict[str, AgentConfig], sandbox: FileSandbox,
                            terminal: SafeTerminal, task) -> OfficeState:
    app_graph = build_office_graph(workers, sandbox, terminal)
    initial: OfficeState = {
        "task_id": task.id,
        "task_title": task.title,
        "task_description": task.description,
        "messages": [HumanMessage(
            content=f"New ticket: {task.title}\n\n{task.description}")],
        "next_agent": "",
        "iterations": 0,
    }
    return await app_graph.ainvoke(initial)


# ---- helpers -----------------------------------------------------------------
def _short(args: dict, limit: int = 60) -> str:
    s = json.dumps(args)
    return s if len(s) <= limit else s[:limit] + "…"


def _parse_route(text: str, valid: set[str]) -> tuple[str, str]:
    try:
        start, end = text.find("{"), text.rfind("}") + 1
        data = json.loads(text[start:end])
        nxt = data.get("next", "FINISH")
        return (nxt if nxt in valid else "FINISH"), data.get("reason", "")
    except Exception:
        return "FINISH", "unparseable routing response"
