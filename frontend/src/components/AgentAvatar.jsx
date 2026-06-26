const STATUS_STYLES = {
  idle:      "bg-slate-200 text-slate-600",
  thinking:  "bg-amber-100 text-amber-700 animate-pulse",
  coding:    "bg-blue-100 text-blue-700",
  testing:   "bg-purple-100 text-purple-700",
  reviewing: "bg-teal-100 text-teal-700",
  error:     "bg-red-100 text-red-700",
};

export function AgentAvatar({ agent, live }) {
  const status = live?.status ?? "idle";
  const detail = live?.detail ?? "Idle";
  const progress = live?.progress ?? 0;

  return (
    <div className="w-40 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <img
          src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
          alt={agent.name}
          className="h-10 w-10 rounded-full bg-slate-100"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{agent.name}</p>
          <p className="truncate text-xs text-slate-500">{agent.role}</p>
        </div>
      </div>

      <span className={`mt-2 inline-block rounded px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[status]}`}>
        {status.toUpperCase()}
      </span>
      <p className="mt-1 truncate text-[11px] text-slate-600" title={detail}>{detail}</p>

      <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-slate-100">
        <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
