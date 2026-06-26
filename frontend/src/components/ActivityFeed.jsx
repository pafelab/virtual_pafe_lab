const TYPE_COLOR = {
  info: "text-slate-300",
  tool: "text-blue-300",
  llm: "text-emerald-300",
  handoff: "text-amber-300",
  error: "text-red-300",
};

export function ActivityFeed({ logs }) {
  return (
    <div className="h-72 overflow-y-auto rounded-2xl bg-slate-900 p-3 font-mono text-xs" aria-live="polite">
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
