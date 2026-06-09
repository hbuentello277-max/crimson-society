"use client";

import { MOBILE_COPILOT_QUICK_ACTIONS } from "@/lib/mobile-copilot/quick-actions";
import type { MobileCopilotQuickAction } from "@/lib/mobile-copilot/types";

export function QuickActionChips({
  disabled,
  onAction,
}: {
  disabled?: boolean;
  onAction: (action: MobileCopilotQuickAction) => void;
}) {
  return (
    <section className="space-y-2">
      <p className="px-1 text-[10px] uppercase tracking-[0.2em] text-[#e87a82]">Quick Actions</p>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {MOBILE_COPILOT_QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={disabled}
            onClick={() => onAction(action)}
            className="shrink-0 rounded-full border border-[#b4141e]/30 bg-[#0a0608]/95 px-3.5 py-2.5 text-[11px] font-medium text-zinc-200 transition hover:border-[#b4141e]/55 hover:bg-[#b4141e]/10 disabled:opacity-50"
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}
