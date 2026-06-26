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