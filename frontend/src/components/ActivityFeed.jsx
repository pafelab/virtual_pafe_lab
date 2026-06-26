import { useEffect, useRef } from "react";
import { Terminal, Radio } from "lucide-react";

const LOG_TYPE_CONFIG = {
  info:    { text: "text-slate-300", tag: "INFO", badge: "bg-slate-800/80 text-slate-400 border-slate-700/50" },
  tool:    { text: "text-sky-400", tag: "TOOL", badge: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  llm:     { text: "text-emerald-400", tag: "AI  ", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  handoff: { text: "text-amber-400", tag: "FLOW", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  error:   { text: "text-red-400", tag: "ERR ", badge: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export function ActivityFeed({ logs }) {
  const containerRef = useRef(null);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col flex-1 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-2xl">
      {/* Terminal Bar */}
      <div className="flex items-center justify-between bg-slate-950/80 border-b border-slate-900 px-4 py-3">
        <div className="flex items-center gap-6">
          {/* Window Mac-style controls */}
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500/30 border border-red-500/50" />
            <span className="h-3 w-3 rounded-full bg-amber-500/30 border border-amber-500/50" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/30 border border-emerald-500/50" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Terminal className="h-3.5 w-3.5 text-indigo-400" />
            <span className="font-mono">office_activity.log</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold text-indigo-400 border border-indigo-500/25">
          <Radio className="h-3 w-3 animate-pulse" />
          <span>LIVE LOG</span>
        </div>
      </div>

      {/* Terminal Screen */}
      <div 
        ref={containerRef}
        className="h-72 overflow-y-auto p-4 font-mono text-xs space-y-2 bg-slate-950/40" 
        aria-live="polite"
      >
        {logs.length === 0 && (
          <p className="text-slate-650 italic leading-relaxed">
            // waiting for agent activity, run orchestration by dropping a task to "In Progress"...
          </p>
        )}
        {logs.map((l, i) => {
          const cfg = LOG_TYPE_CONFIG[l.log_type] || LOG_TYPE_CONFIG.info;
          return (
            <div key={i} className={`flex items-start gap-2.5 leading-relaxed ${cfg.text}`}>
              <span className="text-slate-600 select-none flex-shrink-0">
                [{new Date(l.t).toLocaleTimeString()}]
              </span>
              <span className={`inline-block font-mono text-[9px] font-bold px-1 py-0.5 rounded border leading-none tracking-wide flex-shrink-0 ${cfg.badge}`}>
                {cfg.tag}
              </span>
              <span className="break-all whitespace-pre-wrap">{l.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
