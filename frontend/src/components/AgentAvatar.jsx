export function AgentAvatar({ agent, live }) {
  const status = live?.status ?? "idle";
  const detail = live?.detail ?? "Idle";
  const progress = live?.progress ?? 0;

  const STATUS_CONFIG = {
    idle:      { text: "text-slate-400 bg-slate-900/60 border-slate-800", dot: "bg-slate-500", label: "Idle" },
    thinking:  { text: "text-amber-400 bg-amber-500/10 border-amber-500/20", dot: "bg-amber-400 animate-pulse", label: "Thinking" },
    coding:    { text: "text-sky-450 bg-sky-500/10 border-sky-500/20", dot: "bg-sky-400 animate-pulse", label: "Coding" },
    testing:   { text: "text-purple-400 bg-purple-500/10 border-purple-500/20", dot: "bg-purple-400 animate-pulse", label: "Testing" },
    reviewing: { text: "text-teal-400 bg-teal-500/10 border-teal-500/20", dot: "bg-teal-400 animate-pulse", label: "Reviewing" },
    error:     { text: "text-red-400 bg-red-500/10 border-red-500/20", dot: "bg-red-500 animate-ping", label: "Error" },
  };

  const currentStatus = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

  return (
    <div 
      className={`w-40 rounded-xl border p-3 transition-all duration-300 bg-slate-900/40 backdrop-blur-md hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/5 ${
        status !== "idle" ? "border-indigo-500/20 bg-slate-900/65" : "border-slate-800/80"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="relative flex-shrink-0">
          <img
            src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(agent.name)}`}
            alt={`${agent.name}'s avatar`}
            className={`h-10 w-10 rounded-full bg-slate-950 p-0.5 transition-all duration-300 ${
              status !== "idle" ? "ring-2 ring-indigo-500/55 animate-pulse" : "ring-1 ring-slate-800"
            }`}
          />
          {status !== "idle" && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentStatus.dot}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${currentStatus.dot}`} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-slate-100 leading-tight" title={agent.name}>{agent.name}</p>
          <p className="truncate text-[10px] text-slate-400 font-medium" title={agent.role}>{agent.role}</p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase ${currentStatus.text}`} aria-live="polite">
          {currentStatus.label}
        </span>
        {progress > 0 && progress < 100 && (
          <span className="text-[9px] font-bold text-slate-400">{progress}%</span>
        )}
      </div>
      
      <p className="mt-2 truncate text-[10px] text-slate-350 leading-tight" title={detail}>{detail}</p>

      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-950/80 border border-slate-900/60" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.4)]" 
          style={{ width: `${progress}%` }} 
        />
      </div>
    </div>
  );
}
