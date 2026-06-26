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
      <input className="input" placeholder="Name (e.g. Ben)" value={form.name} onChange={set("name")} />
      <input className="input" placeholder="Role (e.g. QA Engineer)" value={form.role} onChange={set("role")} />
      <textarea className="input" rows={2} placeholder="Personality (e.g. meticulous, loves emojis 🕷️)"
        value={form.personality_prompt} onChange={set("personality_prompt")} />
      <textarea className="input" rows={3} placeholder="Expertise / system instructions"
        value={form.system_instructions} onChange={set("system_instructions")} />
      <input className="input" placeholder="Avatar URL (optional)" value={form.avatar_url} onChange={set("avatar_url")} />
      <select className="input" value={form.room} onChange={set("room")}>
        <option value="dev_lab">Development Lab</option>
        <option value="qa_bay">QA &amp; Testing Bay</option>
        <option value="strategy">Strategy Lounge</option>
      </select>
      <button
        onClick={submit}
        disabled={busy}
        className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Hiring…" : "Hire Agent"}
      </button>
    </div>
  );
}
// NOTE: Avatar generation (Imagen/Stable Diffusion) would post the description
// to a backend image route and set `avatar_url` from the returned image.
