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
