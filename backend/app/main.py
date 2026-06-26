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
