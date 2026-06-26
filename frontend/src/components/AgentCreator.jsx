import { useState } from "react";
import { api } from "../api/client";
import { UserPlus, Loader2 } from "lucide-react";

const EMPTY = {
  name: "", role: "", personality_prompt: "", system_instructions: "",
  avatar_url: "", room: "dev_lab",
};

export function AgentCreator({ onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit() {
    if (!form.name || !form.role) return;
    setBusy(true);
    try {
      const agent = await api.createAgent(form);
      onCreated(agent);
      setForm(EMPTY);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/35 p-5 backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
        <UserPlus className="h-4.5 w-4.5 text-indigo-400" />
        <h3 className="text-sm font-bold text-slate-200 tracking-wide">Hire an Agent</h3>
      </div>
      
      <div className="space-y-3">
        <div>
          <label htmlFor="agent-name" className="sr-only">Name</label>
          <input id="agent-name" className="input" placeholder="Name (e.g. Anya)" value={form.name} onChange={set("name")} />
        </div>
        <div>
          <label htmlFor="agent-role" className="sr-only">Role</label>
          <input id="agent-role" className="input" placeholder="Role (e.g. Senior Developer)" value={form.role} onChange={set("role")} />
        </div>
        <div>
          <label htmlFor="agent-personality" className="sr-only">Personality</label>
          <textarea id="agent-personality" className="input" rows={2} placeholder="Personality (e.g. meticulous, uses emoji log highlights)"
            value={form.personality_prompt} onChange={set("personality_prompt")} />
        </div>
        <div>
          <label htmlFor="agent-instructions" className="sr-only">Expertise / system instructions</label>
          <textarea id="agent-instructions" className="input" rows={3} placeholder="Expertise / system instructions"
            value={form.system_instructions} onChange={set("system_instructions")} />
        </div>
        <div>
          <label htmlFor="agent-avatar" className="sr-only">Avatar URL</label>
          <input id="agent-avatar" className="input" placeholder="Avatar URL (optional)" value={form.avatar_url} onChange={set("avatar_url")} />
        </div>
        <div>
          <label htmlFor="agent-room" className="sr-only">Room</label>
          <select id="agent-room" className="input bg-slate-950 text-slate-300 border-slate-800" value={form.room} onChange={set("room")}>
            <option value="dev_lab">Development Lab</option>
            <option value="qa_bay">QA &amp; Testing Bay</option>
            <option value="strategy">Strategy Lounge</option>
          </select>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={busy || !form.name || !form.role}
        className="w-full rounded-xl bg-gradient-to-r from-indigo-650 to-violet-650 py-2.5 text-sm font-semibold text-white transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        {busy ? (
           <span className="flex items-center justify-center gap-2">
             <Loader2 className="h-4 w-4 animate-spin text-white" />
             Hiring…
           </span>
         ) : "Hire Agent"}
      </button>
    </div>
  );
}
