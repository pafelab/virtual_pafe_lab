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
  const [busy, setBusy] = useState(false);

  const refresh = () => api.listTasks().then(setTasks);
  useEffect(() => { refresh(); }, []);

  async function addTask() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await api.createTask({ title });
      setTitle("");
      refresh();
    } finally {
      setBusy(false);
    }
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
        <label htmlFor="new-ticket" className="sr-only">New ticket title</label>
        <input
          id="new-ticket"
          className="input flex-1"
          placeholder="New ticket title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
        />
        <button
          onClick={addTask}
          disabled={busy || !title.trim()}
          className="rounded-lg bg-slate-800 px-4 text-sm text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-opacity"
        >
          {busy ? "Adding..." : "Add"}
        </button>
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
                onDragStart={(e) => e.dataTransfer.getData("task_id") ? null : e.dataTransfer.setData("task_id", String(t.id))}
                className="mb-2 cursor-grab active:cursor-grabbing rounded-lg bg-white p-2 text-sm shadow-sm hover:shadow-md transition-shadow"
                tabIndex={0}
                role="button"
                aria-label={`Task: ${t.title}. Currently in ${col.label}. Drag to move.`}
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
