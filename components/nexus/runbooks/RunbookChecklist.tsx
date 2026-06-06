"use client";

import { useEffect, useMemo, useState } from "react";
import type { RunbookStep } from "@/lib/runbooks/types";

export function RunbookChecklist({
  title,
  steps,
  onChange,
  editable = false,
}: {
  title: string;
  steps: RunbookStep[];
  onChange?: (steps: RunbookStep[]) => void;
  editable?: boolean;
}) {
  const [localSteps, setLocalSteps] = useState(steps);

  useEffect(() => {
    setLocalSteps(steps);
  }, [steps]);

  const items = editable ? localSteps : steps;
  const completedCount = useMemo(
    () => items.filter((step) => step.completed).length,
    [items],
  );

  function toggleStep(stepId: string) {
    const next = localSteps.map((step) =>
      step.id === stepId ? { ...step, completed: !step.completed } : step,
    );
    setLocalSteps(next);
    onChange?.(next);
  }

  return (
    <details open className="overflow-hidden rounded-xl border border-[#b4141e]/20 bg-[#0a0608]/80">
      <summary className="flex cursor-pointer list-none items-center justify-between border-b border-[#b4141e]/15 px-4 py-3 marker:content-none">
        <span className="text-[11px] uppercase tracking-[0.18em] text-[#e87a82]">{title}</span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">
          {completedCount}/{items.length}
        </span>
      </summary>
      <div className="space-y-2 p-4">
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">No steps defined.</p>
        ) : (
          items.map((step) => (
            <label
              key={step.id}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5"
            >
              <input
                type="checkbox"
                checked={Boolean(step.completed)}
                onChange={() => toggleStep(step.id)}
                className="mt-1 h-4 w-4 accent-[#b4141e]"
              />
              <span className="min-w-0">
                <span className="block text-sm text-white">{step.title}</span>
                {step.description ? (
                  <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                    {step.description}
                  </span>
                ) : null}
              </span>
            </label>
          ))
        )}
      </div>
    </details>
  );
}
