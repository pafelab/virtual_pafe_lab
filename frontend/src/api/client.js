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
