import { useEffect, useState } from "react";
import { api } from "./api/client";
import { useOfficeSocket } from "./hooks/useOfficeSocket";
import { OfficeDashboard } from "./components/OfficeDashboard";
import { AgentCreator } from "./components/AgentCreator";
import { ActivityFeed } from "./components/ActivityFeed";
import { KanbanBoard } from "./components/KanbanBoard";
import { LayoutDashboard, Kanban } from "lucide-react";

export default function App() {
  const [agents, setAgents] = useState([]);
  const { agents: live, logs } = useOfficeSocket();

  const refresh = () => api.listAgents().then(setAgents).catch(err => console.error(err));
  useEffect(() => { refresh(); }, []);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* Background glow blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="glow-blob bg-indigo-500/10 -top-40 -left-40" />
        <div className="glow-blob bg-emerald-500/10 top-1/2 -right-40" />
        <div className="glow-blob bg-purple-500/5 bottom-10 left-1/3" />
      </div>

      <main className="relative z-10 mx-auto max-w-7xl p-4 md:p-8 space-y-8">
        {/* Floating Premium Header */}
        <header className="flex items-center justify-between border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-indigo-200 bg-clip-text text-transparent">
                Virtual AI Office
              </h1>
              <p className="text-xs text-slate-400 font-medium">Multi-Agent Collaboration Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-900/60 px-4 py-1.5 border border-slate-800 text-xs font-semibold text-slate-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>Live Sync Active</span>
          </div>
        </header>

        {/* Office Dashboard Grid */}
        <section aria-label="Office Map">
          <OfficeDashboard agents={agents} live={live} />
        </section>

        {/* Bento Grid layout for Form and Logs */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <section aria-label="Create Agent">
            <AgentCreator onCreated={() => refresh()} />
          </section>
          <section className="lg:col-span-2 flex flex-col" aria-label="Activity Feed">
            <ActivityFeed logs={logs} />
          </section>
        </div>

        {/* Task Kanban Board */}
        <section aria-label="Task Board" className="border-t border-slate-900 pt-8 pb-10">
          <div className="flex items-center gap-2 mb-6">
            <Kanban className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-bold tracking-tight text-slate-200">Task Board</h2>
          </div>
          <KanbanBoard />
        </section>
      </main>
    </div>
  );
}
