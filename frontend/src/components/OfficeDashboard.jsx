import { AgentAvatar } from "./AgentAvatar";

const ROOMS = [
  { key: "dev_lab",  label: "🧪 Development Lab" },
  { key: "qa_bay",   label: "🐛 QA & Testing Bay" },
  { key: "strategy", label: "🛋️ Strategy Lounge" },
];

export function OfficeDashboard({ agents, live }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {ROOMS.map((room) => {
        const occupants = agents.filter((a) => (a.room || "dev_lab") === room.key);
        return (
          <section
            key={room.key}
            className="min-h-[220px] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-3"
            // a subtle isometric tilt for the "office" feel
            style={{ transform: "perspective(900px) rotateX(2deg)" }}
          >
            <h3 className="mb-3 text-sm font-bold text-slate-700">{room.label}</h3>
            <div className="flex flex-wrap gap-3">
              {occupants.length === 0 && (
                <p className="text-xs text-slate-400">No agents here yet.</p>
              )}
              {occupants.map((a) => (
                <AgentAvatar key={a.id} agent={a} live={live[a.id]} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
