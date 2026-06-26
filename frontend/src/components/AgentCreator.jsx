import { useState } from "react";
import { api } from "../api/client";

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
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-bold">⚙️ Hire an Agent</h3>
      <div>
        <label htmlFor="agent-name" className="sr-only">Name</label>
        <input id="agent-name" className="input" placeholder="Name (e.g. Ben)" value={form.name} onChange={set("name")} />
      </div>
      <div>
        <label htmlFor="agent-role" className="sr-only">Role</label>
        <input id="agent-role" className="input" placeholder="Role (e.g. QA Engineer)" value={form.role} onChange={set("role")} />
      </div>
      <div>
        <label htmlFor="agent-personality" className="sr-only">Personality</label>
        <textarea id="agent-personality" className="input" rows={2} placeholder="Personality (e.g. meticulous, loves emojis 🕷️)"
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
        <select id="agent-room" className="input" value={form.room} onChange={set("room")}>
          <option value="dev_lab">Development Lab</option>
          <option value="qa_bay">QA &amp; Testing Bay</option>
          <option value="strategy">Strategy Lounge</option>
        </select>
      </div>
      <button
        onClick={submit}
        disabled={busy || !form.name || !form.role}
        className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-opacity"
      >
        {busy ? (
           <span className="flex items-center justify-center gap-2">
             <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
             Hiring…
           </span>
         ) : "Hire Agent"}
      </button>
    </div>
  );
}
