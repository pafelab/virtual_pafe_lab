# Virtual AI Office — Multi-Agent Orchestration Workspace

**Design, Implementation Plan, Sample Code & Test Cases**

> A gamified "virtual office" where specialized AI agents (personas) collaborate on a real codebase. A central **Hub** tracks agent state in real time, **Worker** agents act within defined roles, and an **Integration** layer pipes codebase context + personality into Gemini via tool/function calling.

---

## Table of Contents

1. [Goals & Scope](#1-goals--scope)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Repository Structure](#4-repository-structure)
5. [Data Models & Schema](#5-data-models--schema)
6. [Implementation Plan (Phased)](#6-implementation-plan-phased)
7. [Sample Code — Backend](#7-sample-code--backend)
8. [Sample Code — Frontend](#8-sample-code--frontend)
9. [Test Cases](#9-test-cases)
10. [Security Model](#10-security-model)
11. [Local Setup & Run](#11-local-setup--run)
12. [Roadmap & Extensions](#12-roadmap--extensions)

---

## 1. Goals & Scope

### 1.1 Product goals

| # | Goal | Success signal |
|---|------|----------------|
| G1 | Let a user define AI "employees" with name, role, personality, and expertise | Agent persisted and visible on the office map |
| G2 | Orchestrate multiple agents on a single task with hand-offs (Dev → QA → fix loop) | A task moves Backlog → Done with logged inter-agent messages |
| G3 | Give agents safe access to a real project folder (read/write/patch) | Files changed only inside the sandbox root |
| G4 | Let agents run commands (`pytest`, `npm test`) and self-correct on failure | Failed test output is fed back and a retry occurs |
| G5 | Show live status + activity in a gamified office UI | WebSocket updates render agent micro-status and a feed |

### 1.2 In scope (MVP)

- Hub state manager + WebSocket broadcast
- Agent CRUD + persona prompt assembly
- LangGraph supervisor/worker orchestration
- File sandbox + safe terminal tools
- SQLite persistence (agents, tasks, logs, chat)
- React UI: office grid, agent creator, activity feed, Kanban

### 1.3 Out of scope (MVP)

- True 3D engine (we use a 2.5D isometric/CSS grid)
- Multi-user auth / cloud deploy (single local user assumed)
- Fine-tuning models (we use prompting + tools only)

---

## 2. System Architecture

### 2.1 Three operational layers

```
┌──────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React + Vite)                       │
│   Office Grid · Agent Creator · Activity Feed · Kanban Board           │
│             ▲ REST (CRUD)              ▲ WebSocket (live state/logs)    │
└─────────────┼─────────────────────────┼────────────────────────────────┘
              │                         │
┌─────────────┼─────────────────────────┼────────────────────────────────┐
│             ▼          BACKEND (FastAPI)▼                               │
│                                                                        │
│   ┌────────────────────┐   THE HUB    ┌──────────────────────────────┐ │
│   │  REST API Routers  │◄────────────►│  State Manager (agent status)│ │
│   └─────────┬──────────┘              │  + WebSocket pub/sub broker  │ │
│             │                         └───────────────┬──────────────┘ │
│             ▼                                         │                │
│   ┌──────────────────────────────────────────────────▼──────────────┐ │
│   │           THE WORKERS — LangGraph Orchestrator                   │ │
│   │  Supervisor node ─► routes ─► [Frontend Dev][QA][DBA][...]       │ │
│   │       ▲                                  │                       │ │
│   │       └──────────── hand-off / retry ◄───┘                       │ │
│   └───────────────┬───────────────────────────────┬─────────────────┘ │
│                   │ tool calls                     │ LLM calls         │
│        ┌──────────▼──────────┐          ┌──────────▼────────────────┐  │
│        │   AGENT TOOLS       │          │   INTEGRATION LAYER       │  │
│        │ FileSandbox         │          │  Gemini (Google Gen AI)   │  │
│        │ SafeTerminal        │          │  context + persona inject │  │
│        └──────────┬──────────┘          └───────────────────────────┘  │
│                   │                                                    │
│        ┌──────────▼──────────┐          ┌───────────────────────────┐  │
│        │  Local Project Dir  │          │  SQLite (profiles, tasks, │  │
│        │   (sandbox root)    │          │   logs, chat history)     │  │
│        └─────────────────────┘          └───────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component responsibilities

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| **Hub** | `StateManager` | Single source of truth for each agent's status (`idle/thinking/coding/testing/reviewing/error`) and micro-status text |
| **Hub** | `WebSocketBroker` | Fan-out of state changes and activity-log lines to all connected UIs |
| **Workers** | `OrchestratorGraph` | Cyclical LangGraph: supervisor decides next agent; workers do their part and hand off |
| **Workers** | `AgentPersona` | Builds the per-agent system prompt from role + personality + expertise + codebase context |
| **Integration** | `GeminiClient` | Wraps Google Gen AI SDK, exposes tool/function-calling loop |
| **Tools** | `FileSandbox` | Path-guarded read/write/patch inside one project root |
| **Tools** | `SafeTerminal` | Allow-listed shell execution with timeout, captures stdout/stderr |
| **Persistence** | SQLite + SQLAlchemy | Agents, tasks, activity logs, chat messages |

### 2.3 Orchestration sequence (Dev → QA → fix loop)

```
User drops "Add /login endpoint" ticket onto "In Progress" (assigned: Anya, Dev)
   │
   ▼
POST /api/orchestrate {task_id}
   │
   ▼
Supervisor (Gemini) reads task + state ─► chooses "frontend_dev" (Anya)
   │
   ▼
Anya: status=coding  ─► read_file(auth.py) ─► write_file(login.py) ─► hand off
   │   (Hub broadcasts: "Anya: Writing login.py (60%)")
   ▼
Supervisor ─► chooses "qa_engineer" (Ben)
   │
   ▼
Ben: status=testing ─► run_command("pytest -q") ─► FAIL (1 error)
   │   (Hub broadcasts test output to Activity Feed)
   ▼
Supervisor ─► routes back to Anya with failure context (retry, iteration+1)
   │
   ▼
Anya: patch_file(login.py) ─► Ben re-runs pytest ─► PASS
   │
   ▼
Supervisor ─► END ─► task.status = "done"
```

---

## 3. Technology Stack

| Concern | Choice | Why |
|---------|--------|-----|
| UI framework | **React 18 + Vite** | Fast HMR, simple build |
| Styling | **Tailwind CSS** | Rapid gamified layout, utility classes |
| Desktop shell (optional) | **Tauri** (preferred) or Electron | Native local-FS access; Tauri = smaller/safer Rust core |
| Backend API | **FastAPI** | Async, typed, WebSocket support, auto OpenAPI |
| Orchestration | **LangGraph** | Stateful, **cyclical** multi-agent graphs (supervisor + retries) |
| Agent abstractions | **LangChain** | Tool binding, message types |
| LLM | **Google Gen AI SDK → Gemini 1.5/2.x Pro** | Large context window to feed whole codebases |
| Persistence | **SQLite + SQLAlchemy** | Zero-config local store |
| Realtime | **WebSocket (FastAPI/Starlette)** | Push agent status + logs |
| Tests (backend) | **pytest + pytest-asyncio + httpx** | Unit + API tests |
| Tests (frontend) | **Vitest + React Testing Library** | Component + hook tests |

**Pinned versions** (`backend/requirements.txt` excerpt):

```
fastapi==0.115.*
uvicorn[standard]==0.30.*
pydantic==2.*
pydantic-settings==2.*
sqlalchemy==2.*
langgraph==0.2.*
langchain==0.3.*
langchain-google-genai==2.*
google-genai==0.3.*          # Google Gen AI SDK
websockets==13.*
pytest==8.*
pytest-asyncio==0.24.*
httpx==0.27.*
```

> **Model note:** Use the current Gemini Pro model string from Google's docs at integration time (model availability changes). The code reads it from `settings.gemini_model` so you can swap without touching logic.

---

## 4. Repository Structure

```
virtual-ai-office/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, routers, WebSocket endpoint
│   │   ├── config.py               # Settings (env-driven)
│   │   ├── database.py             # SQLAlchemy engine/session
│   │   ├── models.py               # ORM models
│   │   ├── schemas.py              # Pydantic request/response models
│   │   ├── hub/
│   │   │   ├── state_manager.py    # Agent status registry + broadcast
│   │   │   └── ws_broker.py        # WebSocket connection manager
│   │   ├── agents/
│   │   │   ├── persona.py          # System-prompt assembly
│   │   │   └── orchestrator.py     # LangGraph supervisor/worker graph
│   │   ├── llm/
│   │   │   └── gemini_client.py    # Google Gen AI SDK wrapper + tool loop
│   │   ├── tools/
│   │   │   ├── file_sandbox.py     # Guarded read/write/patch
│   │   │   └── terminal.py         # Allow-listed shell runner
│   │   └── routers/
│   │       ├── agents.py
│   │       ├── tasks.py
│   │       └── orchestrate.py
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_file_sandbox.py
│   │   ├── test_terminal.py
│   │   ├── test_state_manager.py
│   │   ├── test_persona.py
│   │   ├── test_orchestrator.py
│   │   └── test_api.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── api/client.js
│   │   ├── hooks/useOfficeSocket.js
│   │   └── components/
│   │       ├── OfficeDashboard.jsx
│   │       ├── AgentAvatar.jsx
│   │       ├── AgentCreator.jsx
│   │       ├── ActivityFeed.jsx
│   │       └── KanbanBoard.jsx
│   ├── src/__tests__/
│   │   ├── KanbanBoard.test.jsx
│   │   └── useOfficeSocket.test.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 5. Data Models & Schema

### 5.1 Entity overview

```
Agent 1───∞ Task          (an agent can own many tasks)
Agent 1───∞ ActivityLog   (logs reference the acting agent)
Task  1───∞ ActivityLog   (logs reference the task)
Agent 1───∞ ChatMessage   (inter-agent / agent-user messages)
```

### 5.2 Tables

| Table | Key columns | Notes |
|-------|-------------|-------|
| `agents` | `id, name, role, personality_prompt, system_instructions, avatar_url, status, status_detail, room` | `status` ∈ enum; `room` places the avatar on the grid |
| `tasks` | `id, title, description, status, assigned_agent_id, created_at` | `status` ∈ `backlog/in_progress/review/done` |
| `activity_logs` | `id, agent_id, task_id, log_type, message, created_at` | `log_type` ∈ `info/tool/llm/error/handoff` |
| `chat_messages` | `id, agent_id, role, content, created_at` | `role` ∈ `system/agent/user` |

### 5.3 Status enums

```python
class AgentStatus(str, Enum):
    IDLE = "idle"
    THINKING = "thinking"
    CODING = "coding"
    TESTING = "testing"
    REVIEWING = "reviewing"
    ERROR = "error"

class TaskStatus(str, Enum):
    BACKLOG = "backlog"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"
```

---

## 6. Implementation Plan (Phased)

Each phase ends with a **demoable** increment. Estimates assume one focused developer.

### Phase 0 — Scaffolding (0.5 day)
- [ ] Create monorepo (`backend/`, `frontend/`)
- [ ] FastAPI "hello" + `/health`, Vite React app boots
- [ ] `.env.example`, `requirements.txt`, `package.json`
- **Exit:** both servers run; frontend fetches `/health`.

### Phase 1 — Persistence & Agent CRUD (1 day)
- [ ] SQLAlchemy models + SQLite (`models.py`, `database.py`)
- [ ] Pydantic schemas (`schemas.py`)
- [ ] `routers/agents.py`: create / list / update / delete
- [ ] `routers/tasks.py`: create / list / move status
- **Exit:** can create an agent and a task via REST; rows persist.

### Phase 2 — The Hub (1 day)
- [ ] `StateManager` registry of agent statuses
- [ ] `WebSocketBroker` connection manager + broadcast
- [ ] `/ws` endpoint streaming state + log events
- **Exit:** updating an agent's status pushes a live event to a connected client.

### Phase 3 — Agent Tools / Runtime (1.5 days)
- [ ] `FileSandbox` (read/write/patch + path guard) **← write tests first**
- [ ] `SafeTerminal` (allow-list + timeout + stdout/stderr capture)
- [ ] Wrap both as LangChain tools
- **Exit:** a unit test patches a file and runs `pytest` through the tools; traversal is blocked.

### Phase 4 — Integration (Gemini) (1 day)
- [ ] `GeminiClient` wrapping Google Gen AI SDK
- [ ] Tool/function-calling loop (model → tool_call → tool_result → model)
- [ ] `persona.build_system_prompt()`
- **Exit:** a single agent completes a "write a file then verify" task end-to-end.

### Phase 5 — Orchestration (2 days)
- [ ] LangGraph `OfficeState` + supervisor node + worker nodes
- [ ] Conditional edges (route / retry / END), `max_iterations` guard
- [ ] Emit Hub status + activity logs at each node transition
- [ ] `routers/orchestrate.py` to kick off a run for a task
- **Exit:** Dev→QA→fix loop drives a task to `done` with logged hand-offs.

### Phase 6 — Frontend Office (2 days)
- [ ] `OfficeDashboard` isometric/grid rooms + `AgentAvatar` micro-status
- [ ] `AgentCreator` panel (name/role/personality/expertise + avatar)
- [ ] `ActivityFeed` (WebSocket log stream)
- [ ] `KanbanBoard` drag-and-drop (Backlog/In Progress/Review/Done)
- **Exit:** full demo — create agents, drop a ticket, watch agents work live.

### Phase 7 — Hardening & Optional Desktop (1.5 days)
- [ ] Tauri/Electron wrapper for native FS dialog ("pick project folder")
- [ ] Error states, reconnect logic, rate-limit/backoff for LLM
- [ ] End-to-end test pass; README
- **Exit:** packaged local app; agents operate on a user-chosen folder.

**Critical path:** Phase 3 (tools) and Phase 5 (orchestration) carry the most risk — build and test them before polishing UI.


---

## 7. Sample Code — Backend

All paths are under `backend/`. The code is intentionally compact but runnable in shape; wire in your Gemini API key via `.env`.

### 7.1 `app/config.py`

```python
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # LLM
    google_api_key: str = ""
    gemini_model: str = "gemini-1.5-pro"   # swap to the current Pro model string
    llm_temperature: float = 0.2

    # Sandbox: the ONLY directory agents may touch
    project_root: Path = Path("./workspace").resolve()

    # Safety
    command_timeout_seconds: int = 90
    max_orchestration_iterations: int = 8

    # DB
    database_url: str = "sqlite:///./office.db"


settings = Settings()
settings.project_root.mkdir(parents=True, exist_ok=True)
```

### 7.2 `app/database.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # needed for SQLite + threads
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app import models  # noqa: F401  (register models)
    Base.metadata.create_all(bind=engine)
```

### 7.3 `app/models.py`

```python
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
```

### 7.4 `app/schemas.py`

```python
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
```

### 7.5 `app/hub/ws_broker.py` — WebSocket fan-out

```python
import asyncio
import json
from fastapi import WebSocket


class WebSocketBroker:
    """Tracks live UI connections and broadcasts JSON events to all of them."""

    def __init__(self) -> None:
        self._connections: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._connections.append(ws)

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            if ws in self._connections:
                self._connections.remove(ws)

    async def broadcast(self, event_type: str, payload: dict) -> None:
        message = json.dumps({"type": event_type, "payload": payload})
        async with self._lock:
            dead: list[WebSocket] = []
            for ws in self._connections:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self._connections.remove(ws)
```

### 7.6 `app/hub/state_manager.py` — The Hub

```python
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
```

### 7.7 `app/tools/file_sandbox.py` — guarded file access

```python
from pathlib import Path


class SandboxSecurityError(Exception):
    """Raised when an operation tries to escape the sandbox root."""


class FileSandbox:
    """Read/write/patch confined to a single project root. Blocks path traversal."""

    def __init__(self, root: Path) -> None:
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _resolve(self, rel_path: str) -> Path:
        candidate = (self.root / rel_path).resolve()
        # Path.is_relative_to (3.9+) is the robust containment check.
        if not candidate.is_relative_to(self.root):
            raise SandboxSecurityError(f"Blocked path escape: {rel_path!r}")
        return candidate

    def read_file(self, rel_path: str) -> str:
        path = self._resolve(rel_path)
        if not path.exists():
            return f"[error] file not found: {rel_path}"
        return path.read_text(encoding="utf-8")

    def write_file(self, rel_path: str, content: str) -> str:
        path = self._resolve(rel_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return f"[ok] wrote {len(content)} chars to {rel_path}"

    def patch_file(self, rel_path: str, old: str, new: str) -> str:
        """Targeted edit: replace the first exact occurrence of `old` with `new`."""
        path = self._resolve(rel_path)
        if not path.exists():
            return f"[error] cannot patch missing file: {rel_path}"
        text = path.read_text(encoding="utf-8")
        if old not in text:
            return f"[error] patch anchor not found in {rel_path}"
        path.write_text(text.replace(old, new, 1), encoding="utf-8")
        return f"[ok] patched {rel_path}"

    def list_tree(self, max_entries: int = 200) -> list[str]:
        out = []
        for p in sorted(self.root.rglob("*")):
            if p.is_file():
                out.append(str(p.relative_to(self.root)))
            if len(out) >= max_entries:
                break
        return out
```

### 7.8 `app/tools/terminal.py` — allow-listed shell

```python
import shlex
import subprocess
from pathlib import Path


class TerminalSecurityError(Exception):
    pass


class SafeTerminal:
    """Runs a small allow-list of commands inside the sandbox, capturing output."""

    DEFAULT_ALLOW = {
        "pytest", "python", "python3", "pip",
        "npm", "npx", "node", "yarn",
        "ls", "cat", "git",
    }

    def __init__(self, cwd: Path, timeout: int = 90,
                 allow: set[str] | None = None) -> None:
        self.cwd = Path(cwd).resolve()
        self.timeout = timeout
        self.allow = allow or set(self.DEFAULT_ALLOW)

    def run(self, command: str) -> dict:
        parts = shlex.split(command)
        if not parts:
            raise TerminalSecurityError("empty command")
        program = parts[0]
        if program not in self.allow:
            raise TerminalSecurityError(f"command not allowed: {program!r}")
        # Block shell metacharacters that could chain commands.
        if any(tok in command for tok in ("&&", "||", ";", "|", ">", "<", "`", "$(")):
            raise TerminalSecurityError("shell operators are not permitted")
        try:
            proc = subprocess.run(
                parts,
                cwd=self.cwd,
                capture_output=True,
                text=True,
                timeout=self.timeout,
                shell=False,  # never invoke a shell
            )
            return {
                "command": command,
                "returncode": proc.returncode,
                "stdout": proc.stdout[-8000:],   # cap to keep prompts small
                "stderr": proc.stderr[-8000:],
                "timed_out": False,
            }
        except subprocess.TimeoutExpired:
            return {
                "command": command, "returncode": -1,
                "stdout": "", "stderr": f"timeout after {self.timeout}s",
                "timed_out": True,
            }
```

### 7.9 `app/runtime.py` — shared Hub singletons

```python
from app.hub.ws_broker import WebSocketBroker
from app.hub.state_manager import StateManager

# Created once and shared by routers, the WebSocket endpoint, and the orchestrator.
broker = WebSocketBroker()
hub = StateManager(broker)
```

### 7.10 `app/llm/gemini_client.py` — Integration layer

```python
from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import settings


def get_chat_model(temperature: float | None = None) -> ChatGoogleGenerativeAI:
    """LangChain wrapper over Gemini — used by LangGraph nodes (bind_tools, ainvoke)."""
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.google_api_key,
        temperature=settings.llm_temperature if temperature is None else temperature,
        convert_system_message_to_human=False,
    )


# --- Reference: raw Google Gen AI SDK with automatic function calling ----------
# Shows the brief's "Google Gen AI SDK" path directly. The orchestrator below
# uses the LangChain wrapper instead (cleaner inside LangGraph), but both call
# the same Gemini models. Use this if you prefer SDK-native tool calling.
def raw_gemini_tool_loop(system_prompt: str, user_message: str,
                         tool_functions: list, model: str | None = None) -> str:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.google_api_key)
    chat = client.chats.create(
        model=model or settings.gemini_model,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            tools=tool_functions,  # plain python callables → auto function calling
        ),
    )
    # The SDK executes the tools and feeds stdout/stderr back automatically,
    # which is exactly what lets a QA agent self-correct after a failed test run.
    return chat.send_message(user_message).text
```

### 7.11 `app/agents/persona.py` — persona prompt assembly

```python
from dataclasses import dataclass


@dataclass
class AgentConfig:
    key: str          # routing key, e.g. "frontend_dev"
    agent_id: int
    name: str
    role: str
    personality: str
    instructions: str


# Seed personas a user can start from in the Agent Creator.
DEFAULT_PERSONAS = [
    AgentConfig(
        key="frontend_dev", agent_id=0, name="Anya", role="Senior Frontend Developer",
        personality="Pragmatic, ships fast, leaves clear TODOs, mild dry humor.",
        instructions="You specialize in React + Vite + Tailwind. Prefer small, "
                     "composable components. Never invent backend endpoints that "
                     "don't exist; read files first.",
    ),
    AgentConfig(
        key="qa_engineer", agent_id=0, name="Ben", role="QA Engineer",
        personality="Highly meticulous, hates bugs more than anything, loves emojis 🕷️.",
        instructions="You write Pytest and hunt edge cases in Python/Django models. "
                     "Always run the test suite via run_command and report failures "
                     "with the exact stderr.",
    ),
    AgentConfig(
        key="dba", agent_id=0, name="Mei", role="Database Administrator",
        personality="Careful, migration-first, allergic to data loss.",
        instructions="You manage SQL schemas and migrations. Propose reversible "
                     "migrations and never DROP without an explicit confirmation.",
    ),
]

TOOL_DOCS = """## Tools you can call
- read_file(path): read a file inside the project
- write_file(path, content): create/overwrite a file
- patch_file(path, old, new): replace the first exact occurrence of `old`
- run_command(command): run an allow-listed command (pytest, npm, git, ...) and
  receive {returncode, stdout, stderr}

Rules: stay strictly within your role; read before you write; when your part is
done, end your message with a one-line HANDOFF summary of what you changed."""


def build_system_prompt(cfg: AgentConfig, codebase_tree: list[str]) -> str:
    files = "\n".join(f"  - {p}" for p in codebase_tree[:80]) or "  (empty project)"
    return f"""You are {cfg.name}, a {cfg.role} at a virtual software studio.

## Personality
{cfg.personality}

## Expertise & technical constraints
{cfg.instructions}

## Current project files (sandbox root)
{files}

{TOOL_DOCS}
"""
```

### 7.12 `app/agents/orchestrator.py` — LangGraph supervisor + workers

```python
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
        return sandbox.read_file(path)

    def write_file(path: str, content: str) -> str:
        return sandbox.write_file(path, content)

    def patch_file(path: str, old: str, new: str) -> str:
        return sandbox.patch_file(path, old, new)

    def run_command(command: str) -> str:
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

        final_text = convo[-1].content if convo else ""
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
            f"{m.type}: {str(m.content)[:600]}" for m in state["messages"][-8:]
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
        choice, reason = _parse_route(ai.content, valid=set(workers) | {"FINISH"})
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
```

### 7.13 `app/routers/agents.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.runtime import hub

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.post("", response_model=schemas.AgentOut)
def create_agent(body: schemas.AgentCreate, db: Session = Depends(get_db)):
    agent = models.Agent(**body.model_dump())
    db.add(agent)
    db.commit()
    db.refresh(agent)
    hub.register(agent.id, agent.name)
    return agent


@router.get("", response_model=list[schemas.AgentOut])
def list_agents(db: Session = Depends(get_db)):
    return db.query(models.Agent).all()


@router.delete("/{agent_id}")
def delete_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = db.get(models.Agent, agent_id)
    if not agent:
        raise HTTPException(404, "agent not found")
    db.delete(agent)
    db.commit()
    return {"deleted": agent_id}
```

### 7.14 `app/routers/tasks.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.post("", response_model=schemas.TaskOut)
def create_task(body: schemas.TaskCreate, db: Session = Depends(get_db)):
    task = models.Task(**body.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("", response_model=list[schemas.TaskOut])
def list_tasks(db: Session = Depends(get_db)):
    return db.query(models.Task).all()


@router.patch("/{task_id}/move", response_model=schemas.TaskOut)
def move_task(task_id: int, body: schemas.TaskMove, db: Session = Depends(get_db)):
    task = db.get(models.Task, task_id)
    if not task:
        raise HTTPException(404, "task not found")
    task.status = body.status
    db.commit()
    db.refresh(task)
    return task
```

### 7.15 `app/routers/orchestrate.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.config import settings
from app.agents.persona import AgentConfig
from app.agents.orchestrator import run_orchestration
from app.tools.file_sandbox import FileSandbox
from app.tools.terminal import SafeTerminal

router = APIRouter(prefix="/api/orchestrate", tags=["orchestrate"])


def _slug(role: str) -> str:
    return role.lower().replace(" ", "_")


@router.post("/{task_id}")
async def orchestrate(task_id: int, db: Session = Depends(get_db)):
    task = db.get(models.Task, task_id)
    if not task:
        raise HTTPException(404, "task not found")

    agents = db.query(models.Agent).all()
    if not agents:
        raise HTTPException(400, "no agents defined")

    workers = {
        _slug(a.role): AgentConfig(
            key=_slug(a.role), agent_id=a.id, name=a.name, role=a.role,
            personality=a.personality_prompt, instructions=a.system_instructions,
        )
        for a in agents
    }

    sandbox = FileSandbox(settings.project_root)
    terminal = SafeTerminal(settings.project_root,
                            timeout=settings.command_timeout_seconds)

    task.status = models.TaskStatus.IN_PROGRESS
    db.commit()

    try:
        final = await run_orchestration(workers, sandbox, terminal, task)
        task.status = models.TaskStatus.DONE
        db.commit()
        summary = final["messages"][-1].content if final["messages"] else ""
        return {"task_id": task_id, "status": "done", "summary": summary,
                "iterations": final.get("iterations", 0)}
    except Exception as exc:  # noqa: BLE001
        task.status = models.TaskStatus.REVIEW
        db.commit()
        raise HTTPException(500, f"orchestration failed: {exc}")
```

### 7.16 `app/main.py`

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db, SessionLocal
from app import models
from app.runtime import hub, broker
from app.routers import agents, tasks, orchestrate

app = FastAPI(title="Virtual AI Office")
app.add_middleware(
    CORSMiddleware, allow_origins=["http://localhost:5173"],
    allow_methods=["*"], allow_headers=["*"],
)

app.include_router(agents.router)
app.include_router(tasks.router)
app.include_router(orchestrate.router)


@app.on_event("startup")
def _startup():
    init_db()
    # Re-register existing agents into the live Hub on boot.
    with SessionLocal() as db:
        for a in db.query(models.Agent).all():
            hub.register(a.id, a.name)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await broker.connect(ws)
    # Send the current office snapshot so a fresh UI renders immediately.
    await ws.send_json({"type": "snapshot", "payload": hub.snapshot()})
    try:
        while True:
            await ws.receive_text()  # keepalive / client pings
    except WebSocketDisconnect:
        await broker.disconnect(ws)
```

---

## 8. Sample Code — Frontend

All paths under `frontend/src/`. Uses native `fetch` + `WebSocket` + Tailwind (no extra state library). Kanban uses the built-in HTML5 drag-and-drop API.

### 8.1 `api/client.js`

```javascript
const BASE = "http://localhost:8000";

async function json(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

export const api = {
  listAgents: () => json("/api/agents"),
  createAgent: (body) => json("/api/agents", { method: "POST", body: JSON.stringify(body) }),
  deleteAgent: (id) => json(`/api/agents/${id}`, { method: "DELETE" }),
  listTasks: () => json("/api/tasks"),
  createTask: (body) => json("/api/tasks", { method: "POST", body: JSON.stringify(body) }),
  moveTask: (id, status) =>
    json(`/api/tasks/${id}/move`, { method: "PATCH", body: JSON.stringify({ status }) }),
  orchestrate: (taskId) => json(`/api/orchestrate/${taskId}`, { method: "POST" }),
};

export const WS_URL = "ws://localhost:8000/ws";
```

### 8.2 `hooks/useOfficeSocket.js`

```javascript
import { useEffect, useRef, useState } from "react";
import { WS_URL } from "../api/client";

// Subscribes to the Hub. Returns live agent states (keyed by id) and a log buffer.
export function useOfficeSocket() {
  const [agents, setAgents] = useState({});   // { [agentId]: {status, detail, progress} }
  const [logs, setLogs] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    let alive = true;

    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const { type, payload } = JSON.parse(event.data);
        if (type === "snapshot") {
          const map = {};
          payload.forEach((s) => (map[s.agent_id] = s));
          setAgents(map);
        } else if (type === "agent_status") {
          setAgents((prev) => ({ ...prev, [payload.agent_id]: payload }));
        } else if (type === "activity_log") {
          setLogs((prev) => [...prev.slice(-199), { ...payload, t: Date.now() }]);
        }
      };

      // Auto-reconnect with a small delay.
      ws.onclose = () => {
        if (alive) setTimeout(connect, 1500);
      };
    }

    connect();
    return () => {
      alive = false;
      wsRef.current?.close();
    };
  }, []);

  return { agents, logs };
}
```

### 8.3 `components/AgentAvatar.jsx`

```jsx
const STATUS_STYLES = {
  idle:      "bg-slate-200 text-slate-600",
  thinking:  "bg-amber-100 text-amber-700 animate-pulse",
  coding:    "bg-blue-100 text-blue-700",
  testing:   "bg-purple-100 text-purple-700",
  reviewing: "bg-teal-100 text-teal-700",
  error:     "bg-red-100 text-red-700",
};

export function AgentAvatar({ agent, live }) {
  const status = live?.status ?? "idle";
  const detail = live?.detail ?? "Idle";
  const progress = live?.progress ?? 0;

  return (
    <div className="w-40 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <img
          src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
          alt={agent.name}
          className="h-10 w-10 rounded-full bg-slate-100"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{agent.name}</p>
          <p className="truncate text-xs text-slate-500">{agent.role}</p>
        </div>
      </div>

      <span className={`mt-2 inline-block rounded px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[status]}`}>
        {status.toUpperCase()}
      </span>
      <p className="mt-1 truncate text-[11px] text-slate-600" title={detail}>{detail}</p>

      <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-slate-100">
        <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
```

### 8.4 `components/OfficeDashboard.jsx` (isometric/grid rooms)

```jsx
import { AgentAvatar } from "./AgentAvatar";

const ROOMS = [
  { key: "dev_lab",  label: "🧪 Development Lab" },
  { key: "qa_bay",   label: "🐛 QA & Testing Bay" },
  { key: "strategy", label: "🛋️ Strategy Lounge" },
];

export function OfficeDashboard({ agents, live }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {ROOMS.map((room) => {
        const occupants = agents.filter((a) => (a.room || "dev_lab") === room.key);
        return (
          <section
            key={room.key}
            className="min-h-[220px] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-3"
            // a subtle isometric tilt for the "office" feel
            style={{ transform: "perspective(900px) rotateX(2deg)" }}
          >
            <h3 className="mb-3 text-sm font-bold text-slate-700">{room.label}</h3>
            <div className="flex flex-wrap gap-3">
              {occupants.length === 0 && (
                <p className="text-xs text-slate-400">No agents here yet.</p>
              )}
              {occupants.map((a) => (
                <AgentAvatar key={a.id} agent={a} live={live[a.id]} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

### 8.5 `components/AgentCreator.jsx`

```jsx
import { useState } from "react";
import { api } from "../api/client";

const EMPTY = {
  name: "", role: "", personality_prompt: "", system_instructions: "",
  avatar_url: "", room: "dev_lab",
};

export function AgentCreator({ onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit() {
    if (!form.name || !form.role) return;
    setBusy(true);
    try {
      const agent = await api.createAgent(form);
      onCreated(agent);
      setForm(EMPTY);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-bold">⚙️ Hire an Agent</h3>
      <input className="input" placeholder="Name (e.g. Ben)" value={form.name} onChange={set("name")} />
      <input className="input" placeholder="Role (e.g. QA Engineer)" value={form.role} onChange={set("role")} />
      <textarea className="input" rows={2} placeholder="Personality (e.g. meticulous, loves emojis 🕷️)"
        value={form.personality_prompt} onChange={set("personality_prompt")} />
      <textarea className="input" rows={3} placeholder="Expertise / system instructions"
        value={form.system_instructions} onChange={set("system_instructions")} />
      <input className="input" placeholder="Avatar URL (optional)" value={form.avatar_url} onChange={set("avatar_url")} />
      <select className="input" value={form.room} onChange={set("room")}>
        <option value="dev_lab">Development Lab</option>
        <option value="qa_bay">QA &amp; Testing Bay</option>
        <option value="strategy">Strategy Lounge</option>
      </select>
      <button
        onClick={submit}
        disabled={busy}
        className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Hiring…" : "Hire Agent"}
      </button>
    </div>
  );
}
// NOTE: Avatar generation (Imagen/Stable Diffusion) would post the description
// to a backend image route and set `avatar_url` from the returned image.
```

### 8.6 `components/ActivityFeed.jsx`

```jsx
const TYPE_COLOR = {
  info: "text-slate-300",
  tool: "text-blue-300",
  llm: "text-emerald-300",
  handoff: "text-amber-300",
  error: "text-red-300",
};

export function ActivityFeed({ logs }) {
  return (
    <div className="h-72 overflow-y-auto rounded-2xl bg-slate-900 p-3 font-mono text-xs">
      {logs.length === 0 && <p className="text-slate-500">// waiting for agent activity…</p>}
      {logs.map((l, i) => (
        <div key={i} className={TYPE_COLOR[l.log_type] || "text-slate-300"}>
          <span className="text-slate-500">[{new Date(l.t).toLocaleTimeString()}]</span>{" "}
          {l.message}
        </div>
      ))}
    </div>
  );
}
```

### 8.7 `components/KanbanBoard.jsx` (drag-and-drop + trigger orchestration)

```jsx
import { useEffect, useState } from "react";
import { api } from "../api/client";

const COLUMNS = [
  { key: "backlog", label: "Backlog" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

export function KanbanBoard() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");

  const refresh = () => api.listTasks().then(setTasks);
  useEffect(() => { refresh(); }, []);

  async function addTask() {
    if (!title.trim()) return;
    await api.createTask({ title });
    setTitle("");
    refresh();
  }

  async function onDrop(e, status) {
    const id = Number(e.dataTransfer.getData("task_id"));
    await api.moveTask(id, status);
    // Dropping into "In Progress" kicks off the multi-agent run.
    if (status === "in_progress") api.orchestrate(id).then(refresh);
    refresh();
  }

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <input
          className="input flex-1"
          placeholder="New ticket title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
        />
        <button onClick={addTask} className="rounded-lg bg-slate-800 px-3 text-sm text-white">Add</button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, col.key)}
            className="min-h-[160px] rounded-xl bg-slate-100 p-2"
          >
            <h4 className="mb-2 text-xs font-bold uppercase text-slate-500">{col.label}</h4>
            {tasks.filter((t) => t.status === col.key).map((t) => (
              <div
                key={t.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("task_id", String(t.id))}
                className="mb-2 cursor-grab rounded-lg bg-white p-2 text-sm shadow-sm"
              >
                {t.title}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 8.8 `App.jsx`

```jsx
import { useEffect, useState } from "react";
import { api } from "./api/client";
import { useOfficeSocket } from "./hooks/useOfficeSocket";
import { OfficeDashboard } from "./components/OfficeDashboard";
import { AgentCreator } from "./components/AgentCreator";
import { ActivityFeed } from "./components/ActivityFeed";
import { KanbanBoard } from "./components/KanbanBoard";

export default function App() {
  const [agents, setAgents] = useState([]);
  const { agents: live, logs } = useOfficeSocket();

  const refresh = () => api.listAgents().then(setAgents);
  useEffect(() => { refresh(); }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <h1 className="text-2xl font-black">🏢 Virtual AI Office</h1>

      <OfficeDashboard agents={agents} live={live} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AgentCreator onCreated={() => refresh()} />
        <div className="lg:col-span-2"><ActivityFeed logs={logs} /></div>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-bold">💬 Task Board</h2>
        <KanbanBoard />
      </section>
    </div>
  );
}
```

### 8.9 Tailwind helper (`src/index.css` excerpt)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .input {
    @apply w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
           focus:border-blue-500 focus:outline-none;
  }
}
```

---

## 9. Test Cases

### 9.1 Test strategy

| Layer | What we verify | Tooling |
|-------|----------------|---------|
| File sandbox | Read/write/patch work; **path traversal & escapes are blocked** | pytest |
| Terminal | Allow-listed commands run; disallowed/`shell-operator`/timeout rejected | pytest |
| Hub | Status updates mutate state **and** broadcast events | pytest-asyncio |
| Persona | Prompt embeds role, personality, expertise, and file tree | pytest |
| Orchestrator | Supervisor routing, worker hand-off, retry loop, `FINISH` guard — **with a mocked LLM** | pytest-asyncio |
| API | Agent/task CRUD + status move over HTTP | httpx `TestClient` |
| Frontend | Socket reducer + Kanban render/add flow | Vitest + RTL |

### 9.2 `backend/pytest.ini`

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
```

### 9.3 `tests/conftest.py`

```python
import os
import tempfile
from pathlib import Path

import pytest

# Point the app at a throwaway DB and a dummy key BEFORE importing app modules.
_DB = os.path.join(tempfile.gettempdir(), "office_test.db")
if os.path.exists(_DB):
    os.remove(_DB)
os.environ["DATABASE_URL"] = f"sqlite:///{_DB}"
os.environ["GOOGLE_API_KEY"] = "test-key"

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app                    # noqa: E402


@pytest.fixture
def client():
    # Entering the context manager fires FastAPI startup → init_db() on temp DB.
    with TestClient(app) as c:
        yield c


@pytest.fixture
def tmp_project(tmp_path: Path) -> Path:
    root = tmp_path / "project"
    root.mkdir()
    (root / "auth.py").write_text("def login():\n    return None\n")
    return root
```

### 9.4 `tests/test_file_sandbox.py`

```python
import pytest
from app.tools.file_sandbox import FileSandbox, SandboxSecurityError


def test_write_then_read_roundtrip(tmp_project):
    box = FileSandbox(tmp_project)
    assert "[ok]" in box.write_file("notes/todo.md", "hello")
    assert box.read_file("notes/todo.md") == "hello"


def test_patch_replaces_first_occurrence(tmp_project):
    box = FileSandbox(tmp_project)
    box.write_file("a.txt", "foo bar foo")
    box.patch_file("a.txt", "foo", "BAZ")
    assert box.read_file("a.txt") == "BAZ bar foo"


def test_read_missing_file_is_graceful(tmp_project):
    box = FileSandbox(tmp_project)
    assert "[error]" in box.read_file("does/not/exist.txt")


def test_patch_missing_anchor_reports_error(tmp_project):
    box = FileSandbox(tmp_project)
    box.write_file("a.txt", "content")
    assert "[error]" in box.patch_file("a.txt", "NOPE", "x")


@pytest.mark.parametrize("evil", ["../secret.txt", "../../etc/passwd", "sub/../../out.txt"])
def test_path_traversal_is_blocked(tmp_project, evil):
    box = FileSandbox(tmp_project)
    with pytest.raises(SandboxSecurityError):
        box.read_file(evil)
    with pytest.raises(SandboxSecurityError):
        box.write_file(evil, "x")


def test_nested_write_creates_dirs(tmp_project):
    box = FileSandbox(tmp_project)
    box.write_file("deep/a/b/c.txt", "ok")
    assert (tmp_project / "deep/a/b/c.txt").exists()
```

### 9.5 `tests/test_terminal.py`

```python
import pytest
from app.tools.terminal import SafeTerminal, TerminalSecurityError


def test_allowed_command_runs(tmp_project):
    term = SafeTerminal(tmp_project)
    result = term.run("ls")
    assert result["returncode"] == 0
    assert result["timed_out"] is False


def test_disallowed_command_is_blocked(tmp_project):
    term = SafeTerminal(tmp_project)
    with pytest.raises(TerminalSecurityError):
        term.run("rm -rf /")


@pytest.mark.parametrize("cmd", ["ls && whoami", "cat a | grep b", "echo hi; ls", "ls > out.txt"])
def test_shell_operators_are_blocked(tmp_project, cmd):
    term = SafeTerminal(tmp_project)
    with pytest.raises(TerminalSecurityError):
        term.run(cmd)


def test_timeout_is_captured(tmp_project):
    (tmp_project / "slow.py").write_text("import time\ntime.sleep(3)\n")
    term = SafeTerminal(tmp_project, timeout=1)
    result = term.run("python slow.py")
    assert result["timed_out"] is True
    assert result["returncode"] == -1
```

### 9.6 `tests/test_state_manager.py`

```python
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
```

### 9.7 `tests/test_persona.py`

```python
from app.agents.persona import AgentConfig, build_system_prompt


def test_prompt_embeds_identity_and_files():
    cfg = AgentConfig(
        key="qa", agent_id=2, name="Ben", role="QA Engineer",
        personality="meticulous, loves emojis", instructions="writes Pytest",
    )
    prompt = build_system_prompt(cfg, ["auth.py", "models.py"])

    assert "Ben" in prompt
    assert "QA Engineer" in prompt
    assert "meticulous" in prompt
    assert "writes Pytest" in prompt
    assert "auth.py" in prompt
    assert "run_command" in prompt  # tool docs present
```

### 9.8 `tests/test_orchestrator.py` — end-to-end with a **mocked** Gemini

```python
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
    workers = {"frontend": AgentConfig("frontend", 1, "A", "Frontend Developer", "", "")}
    node = orchestrator.make_supervisor_node(workers)

    state = {"task_id": 1, "task_title": "x", "task_description": "y",
             "messages": [HumanMessage(content="hi")],
             "next_agent": "", "iterations": settings.max_orchestration_iterations}
    out = asyncio.run(node(state))
    assert out["next_agent"] == "FINISH"
```

### 9.9 `tests/test_api.py`

```python
def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_agent_crud(client):
    created = client.post("/api/agents", json={
        "name": "Ben", "role": "QA Engineer",
        "personality_prompt": "meticulous", "system_instructions": "Pytest",
    }).json()
    assert created["id"] > 0
    assert created["status"] == "idle"

    listed = client.get("/api/agents").json()
    assert any(a["name"] == "Ben" for a in listed)

    assert client.delete(f"/api/agents/{created['id']}").json()["deleted"] == created["id"]


def test_task_create_and_move(client):
    task = client.post("/api/tasks", json={"title": "Add /login"}).json()
    assert task["status"] == "backlog"

    moved = client.patch(f"/api/tasks/{task['id']}/move",
                         json={"status": "review"}).json()
    assert moved["status"] == "review"


def test_move_missing_task_404(client):
    r = client.patch("/api/tasks/999999/move", json={"status": "done"})
    assert r.status_code == 404
```

### 9.10 `src/__tests__/useOfficeSocket.test.jsx` (Vitest)

```jsx
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useOfficeSocket } from "../hooks/useOfficeSocket";

// Minimal controllable WebSocket mock.
class MockWS {
  constructor() { MockWS.instance = this; }
  send() {}
  close() {}
}
beforeEach(() => { global.WebSocket = MockWS; });

function fire(data) {
  act(() => MockWS.instance.onmessage({ data: JSON.stringify(data) }));
}

describe("useOfficeSocket", () => {
  it("hydrates from a snapshot", () => {
    const { result } = renderHook(() => useOfficeSocket());
    fire({ type: "snapshot", payload: [{ agent_id: 1, name: "Anya", status: "idle", progress: 0 }] });
    expect(result.current.agents[1].name).toBe("Anya");
  });

  it("applies incremental status updates", () => {
    const { result } = renderHook(() => useOfficeSocket());
    fire({ type: "agent_status", payload: { agent_id: 2, status: "coding", detail: "x", progress: 50 } });
    expect(result.current.agents[2].status).toBe("coding");
  });

  it("appends activity logs", () => {
    const { result } = renderHook(() => useOfficeSocket());
    fire({ type: "activity_log", payload: { message: "supervisor → qa", log_type: "info" } });
    expect(result.current.logs.at(-1).message).toBe("supervisor → qa");
  });
});
```

### 9.11 `src/__tests__/KanbanBoard.test.jsx` (Vitest + RTL)

```jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { KanbanBoard } from "../components/KanbanBoard";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: {
    listTasks: vi.fn().mockResolvedValue([
      { id: 1, title: "Existing ticket", status: "backlog" },
    ]),
    createTask: vi.fn().mockResolvedValue({ id: 2, title: "New", status: "backlog" }),
    moveTask: vi.fn().mockResolvedValue({}),
    orchestrate: vi.fn().mockResolvedValue({}),
  },
}));

beforeEach(() => vi.clearAllMocks());

describe("KanbanBoard", () => {
  it("renders all four columns and existing tasks", async () => {
    render(<KanbanBoard />);
    ["Backlog", "In Progress", "Review", "Done"].forEach((c) =>
      expect(screen.getByText(c)).toBeInTheDocument()
    );
    expect(await screen.findByText("Existing ticket")).toBeInTheDocument();
  });

  it("creates a task from the input", async () => {
    render(<KanbanBoard />);
    fireEvent.change(screen.getByPlaceholderText(/new ticket title/i), {
      target: { value: "Build dashboard" },
    });
    fireEvent.click(screen.getByText("Add"));
    await waitFor(() =>
      expect(api.createTask).toHaveBeenCalledWith({ title: "Build dashboard" })
    );
  });
});
```

### 9.12 Requirements → code → tests traceability

| Brief requirement | Implemented in | Verified by |
|-------------------|----------------|-------------|
| Hub tracks real-time agent status | `hub/state_manager.py` | `test_state_manager.py` |
| Live status pushed to UI | `hub/ws_broker.py`, `/ws`, `useOfficeSocket.js` | `useOfficeSocket.test.jsx` |
| Worker personas (role/personality/expertise) | `agents/persona.py` | `test_persona.py` |
| Multi-agent orchestration + hand-offs + retry | `agents/orchestrator.py` (LangGraph) | `test_orchestrator.py` |
| Gemini integration (context + persona injection) | `llm/gemini_client.py` | mocked in `test_orchestrator.py` |
| File sandbox (read/write/patch, contained) | `tools/file_sandbox.py` | `test_file_sandbox.py` |
| Terminal wrapper (run cmd, capture stdout/stderr, self-correct) | `tools/terminal.py` | `test_terminal.py` |
| Persist profiles/tasks/logs/chat | `models.py`, SQLite | `test_api.py` |
| Agent Creator panel | `components/AgentCreator.jsx` | (manual / E2E) |
| Office grid + avatars + micro-status | `components/OfficeDashboard.jsx`, `AgentAvatar.jsx` | (manual / E2E) |
| Activity feed | `components/ActivityFeed.jsx` | `useOfficeSocket.test.jsx` |
| Kanban drag-and-drop + assign | `components/KanbanBoard.jsx` | `KanbanBoard.test.jsx` |

---

## 10. Security Model

Agents that read/write files **and** run shell commands are powerful and dangerous. The design enforces defense-in-depth:

| Risk | Control | Where |
|------|---------|-------|
| Path escape (read/overwrite arbitrary files) | Resolve against a single root, reject anything not `is_relative_to(root)` | `FileSandbox._resolve` |
| Arbitrary command execution | Strict **allow-list** of program names; everything else rejected | `SafeTerminal.run` |
| Command chaining / redirection / injection | Reject `&& \|\| ; \| > < \` $(` ; never spawn a shell (`shell=False`) | `SafeTerminal.run` |
| Runaway processes | Per-command **timeout** with captured partial output | `SafeTerminal.run` |
| Prompt injection via codebase content | Treat file contents as **data, not instructions**; keep the allow-list/path guard outside the LLM's control so a malicious file can't widen permissions | tools + persona |
| Unbounded agent loops / cost | `max_orchestration_iterations` guard; supervisor must justify `FINISH` | `orchestrator` / `config` |
| Secret leakage | API keys only in `.env` (git-ignored); never sent to the frontend; never logged | `config.py` |
| Destructive DB ops | DBA persona instructed to propose **reversible** migrations and never `DROP` without explicit confirmation; add a human-approval gate before applying | persona + (future approval route) |

**Recommended hardening before real use**
- Add a **human-in-the-loop approval** step for `write_file`/`run_command` on first run of a task (a "Review changes" modal in the UI).
- Run the sandbox in a **container** (Docker) so even an allow-listed `python` can't reach the host.
- Add per-session **token/cost budgets** and exponential backoff on Gemini rate limits.
- Log every tool call to `activity_logs` for a full **audit trail** (already wired via `hub.log`).

> If you wrap the app with Tauri/Electron for native file access, scope the file dialog so the user explicitly picks **one** project folder, and pass only that path as `project_root`.

---

## 11. Local Setup & Run

### 11.1 Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env →  GOOGLE_API_KEY=...   PROJECT_ROOT=/abs/path/to/target/project

uvicorn app.main:app --reload --port 8000
# API docs at http://localhost:8000/docs   ·   WebSocket at ws://localhost:8000/ws
```

`.env.example`:

```
GOOGLE_API_KEY=your-key-here
GEMINI_MODEL=gemini-1.5-pro
PROJECT_ROOT=./workspace
COMMAND_TIMEOUT_SECONDS=90
MAX_ORCHESTRATION_ITERATIONS=8
DATABASE_URL=sqlite:///./office.db
```

### 11.2 Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

### 11.3 Running tests

```bash
# Backend
cd backend && pytest -q

# Frontend
cd frontend && npx vitest run
```

### 11.4 First demo flow
1. Open the UI → **Hire an Agent** (e.g. *Anya / Frontend Developer*, *Ben / QA Engineer*).
2. Add a ticket on the board (e.g. *"Add a /login endpoint and a passing test"*).
3. Drag it to **In Progress** → orchestration starts.
4. Watch the office avatars change status (thinking → coding → testing) and the **Activity Feed** stream tool calls and hand-offs.
5. The ticket lands in **Done** when the supervisor confirms tests pass.

---

## 12. Roadmap & Extensions

| Theme | Extension |
|-------|-----------|
| **Avatars** | Wire `AgentCreator` to an image route that calls Imagen/Stable Diffusion from the agent description, storing the URL on the agent |
| **Codebase memory** | Add a vector index (e.g. embeddings of the repo) so agents retrieve only relevant files instead of the whole tree — useful once context outgrows even Gemini's large window |
| **Inter-agent chat** | Persist `ChatMessage` rows during hand-offs and render a per-task conversation thread |
| **Approval gates** | "Review changes" modal before any `write_file`/`run_command` executes on a new task |
| **Specialist rooms** | More personas/rooms (Security Auditor, Tech Writer, DevOps) and room-scoped tool permissions |
| **Cost & evals** | Token/cost meter per run; a small eval harness scoring task success rate and retries |
| **Desktop packaging** | Tauri build with a native "Open Project Folder" dialog and an embedded backend |
| **Containment** | Dockerized sandbox per session for true host isolation |

---

*This document is a self-contained blueprint: architecture, a phased build plan, runnable-shaped sample code for every layer, and a test suite (with an end-to-end orchestration test using a mocked LLM) that maps back to each requirement in the brief.*
