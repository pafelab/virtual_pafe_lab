import { useEffect, useState } from "react";
import { api } from "../api/client";
import { GripVertical, Plus } from "lucide-react";

const COLUMNS = [
  { key: "backlog", label: "Backlog", dot: "bg-slate-500", text: "text-slate-400" },
  { key: "in_progress", label: "In Progress", dot: "bg-indigo-400 animate-pulse", text: "text-indigo-400" },
  { key: "review", label: "Review", dot: "bg-purple-400 animate-pulse", text: "text-purple-400" },
  { key: "done", label: "Done", dot: "bg-emerald-500", text: "text-emerald-400" },
];

export function KanbanBoard() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOverCol, setDragOverCol] = useState(null);

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
    setDragOverCol(null);
    const id = Number(e.dataTransfer.getData("task_id"));
    if (isNaN(id)) return;
    await api.moveTask(id, status);
    // Dropping into "In Progress" kicks off the multi-agent run.
    if (status === "in_progress") api.orchestrate(id).then(refresh);
    refresh();
  }

  return (
    <div className="space-y-4">
      {/* Input section */}
      <div className="flex gap-2">
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
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 px-5 text-sm transition-all duration-200 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-slate-800 disabled:opacity-40 disabled:pointer-events-none font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>{busy ? "Adding..." : "Add"}</span>
        </button>
      </div>

      {/* Board columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverCol(col.key);
            }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={(e) => onDrop(e, col.key)}
            className={`min-h-[220px] rounded-2xl border p-4 transition-all duration-300 flex flex-col ${
              dragOverCol === col.key 
                ? "bg-slate-900/60 border-indigo-500/40 shadow-inner" 
                : "bg-slate-900/15 border-slate-900/80"
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`h-2 w-2 rounded-full ${col.dot}`} />
              <h4 className={`text-xs font-extrabold uppercase tracking-widest ${col.text}`}>{col.label}</h4>
              <span className="ml-auto text-[10px] font-bold text-slate-500 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-900">
                {tasks.filter((t) => t.status === col.key).length}
              </span>
            </div>

            {/* Task list container */}
            <div className="flex-1 space-y-2 overflow-y-auto max-h-[280px] pr-1 pb-1">
              {tasks.filter((t) => t.status === col.key).map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("task_id", String(t.id));
                  }}
                  className="group flex items-center gap-2 cursor-grab active:cursor-grabbing rounded-xl bg-slate-950/90 border border-slate-900 px-3 py-3 text-sm hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200"
                  tabIndex={0}
                  role="button"
                  aria-label={`Task: ${t.title}. Currently in ${col.label}. Drag to move.`}
                >
                  <GripVertical className="h-4 w-4 text-slate-700 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                  <span className="truncate text-slate-350 font-medium text-xs leading-snug group-hover:text-slate-100 transition-colors" title={t.title}>
                    {t.title}
                  </span>
                </div>
              ))}
              {tasks.filter((t) => t.status === col.key).length === 0 && (
                <div className="h-full flex items-center justify-center border border-dashed border-slate-900/60 rounded-xl py-6 text-center">
                  <p className="text-[10px] text-slate-650 font-medium uppercase tracking-wider">Empty bay</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
