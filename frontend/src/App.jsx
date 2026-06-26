import { useEffect, useState } from "react";
import { api } from "./api/client";
import { useOfficeSocket } from "./hooks/useOfficeSocket";
import { OfficeDashboard } from "./components/OfficeDashboard";
import { AgentCreator } from "./components/AgentCreator";
import { ActivityFeed } from "./components/ActivityFeed";
import { KanbanBoard } from "./components/KanbanBoard";

export default function App() {
  const [agents, setAgents] = useState([]);
  const { agents: live, logs } = useOfficeSocket();

  const refresh = () => api.listAgents().then(setAgents).catch(err => console.error(err));
  useEffect(() => { refresh(); }, []);

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <h1 className="text-2xl font-black">🏢 Virtual AI Office</h1>

      <OfficeDashboard agents={agents} live={live} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section aria-label="Create Agent">
          <AgentCreator onCreated={() => refresh()} />
        </section>
        <section className="lg:col-span-2" aria-label="Activity Feed">
          <ActivityFeed logs={logs} />
        </section>
      </div>

      <section aria-label="Task Board">
        <h2 className="mb-2 text-lg font-bold">💬 Task Board</h2>
        <KanbanBoard />
      </section>
    </main>
  );
}
