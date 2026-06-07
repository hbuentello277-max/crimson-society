"use client";

import { useState } from "react";
import { useNexusPost } from "@/hooks/nexus/useNexusPost";

export function OwnerNoteForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const { post, isPending } = useNexusPost();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [importance, setImportance] = useState(6);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const result = await post("/api/nexus/memory", {
      title,
      summary,
      importance_score: importance,
    }, "owner-note");

    if (!result.ok) {
      setError(result.error ?? "Failed to save owner note");
      return;
    }

    setTitle("");
    setSummary("");
    setImportance(6);
    await onCreated();
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3 rounded-2xl border border-[#b4141e]/25 bg-black/40 p-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Add Owner Note</p>
        <p className="mt-1 text-xs text-zinc-500">Manual operational memory. No automation.</p>
      </div>

      <label className="block space-y-1">
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
          required
        />
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Summary</span>
        <textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={4}
          className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
          required
        />
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Importance (1-10)</span>
        <input
          type="number"
          min={1}
          max={10}
          value={importance}
          onChange={(event) => setImportance(Number(event.target.value))}
          className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
        />
      </label>

      {error ? <p className="text-sm text-amber-300">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending("owner-note")}
        className="rounded-lg border border-[#b4141e]/40 bg-[#b4141e]/10 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7] transition hover:bg-[#b4141e]/20 disabled:opacity-50"
      >
        {isPending("owner-note") ? "Saving..." : "Save Note"}
      </button>
    </form>
  );
}
