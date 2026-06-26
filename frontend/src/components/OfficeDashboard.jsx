import { AgentAvatar } from "./AgentAvatar";
import { Code2, ShieldCheck, Lightbulb } from "lucide-react";

const ROOMS = [
  { 
    key: "dev_lab",  
    label: "Development Lab", 
    icon: Code2,
    glowColor: "shadow-indigo-500/5",
    textClass: "text-indigo-400"
  },
  { 
    key: "qa_bay",   
    label: "QA & Testing Bay", 
    icon: ShieldCheck,
    glowColor: "shadow-purple-500/5",
    textClass: "text-purple-400"
  },
  { 
    key: "strategy", 
    label: "Strategy Lounge", 
    icon: Lightbulb,
    glowColor: "shadow-amber-500/5",
    textClass: "text-amber-400"
  },
];

export function OfficeDashboard({ agents, live }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {ROOMS.map((room) => {
        const occupants = agents.filter((a) => (a.room || "dev_lab") === room.key);
        const IconComponent = room.icon;
        
        // Check if any occupant in this room is active
        const hasActiveOccupant = occupants.some(
          (a) => live[a.id]?.status && live[a.id]?.status !== "idle"
        );

        return (
          <section
            key={room.key}
            className={`min-h-[220px] rounded-2xl border p-4 transition-all duration-500 flex flex-col justify-between backdrop-blur-xl ${
              hasActiveOccupant 
                ? `border-indigo-500/40 bg-slate-900/50 shadow-xl ${room.glowColor}` 
                : "border-slate-800/60 bg-slate-900/25"
            }`}
            style={{ transform: "perspective(1200px) rotateX(1deg)" }}
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4 border-b border-slate-900 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 ${room.textClass}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold tracking-wide text-slate-200">{room.label}</h3>
                </div>
                {occupants.length > 0 && (
                  <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-800/50">
                    {occupants.length} {occupants.length === 1 ? "Agent" : "Agents"}
                  </span>
                )}
              </div>

              {/* Occupants list */}
              <div className="flex flex-wrap gap-3 overflow-y-auto max-h-[160px] pr-1 pb-2">
                {occupants.length === 0 && (
                  <div className="flex flex-col items-center justify-center w-full py-8 text-center">
                    <p className="text-xs text-slate-500 font-medium">No agents here yet.</p>
                  </div>
                )}
                {occupants.map((a) => (
                  <AgentAvatar key={a.id} agent={a} live={live[a.id]} />
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
