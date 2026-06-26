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
        summary = final["messages"][-1].text if final["messages"] else ""
        return {"task_id": task_id, "status": "done", "summary": summary,
                "iterations": final.get("iterations", 0)}
    except Exception as exc:  # noqa: BLE001
        task.status = models.TaskStatus.REVIEW
        db.commit()
        raise HTTPException(500, f"orchestration failed: {exc}")
