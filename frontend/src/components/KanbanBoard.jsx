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
