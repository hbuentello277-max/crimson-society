"use client";

import { useState } from "react";

type DetailItem = {
  label: string;
  value: string;
};

type Props = {
  items: DetailItem[];
};

export function TechnicalDetailsToggle({ items }: Props) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 hover:text-zinc-400"
      >
        {open ? "Hide technical details" : "View technical details"}
      </button>
      {open && (
        <dl className="mt-2 space-y-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-[10px] text-zinc-500">
          {items.map((item) => (
            <div key={item.label} className="flex flex-wrap gap-x-2">
              <dt className="text-zinc-600">{item.label}:</dt>
              <dd className="break-all text-zinc-400">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
