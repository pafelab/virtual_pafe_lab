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
