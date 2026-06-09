"use client";

import Link from "next/link";
import type { ExecutiveActionCenter } from "@/lib/executive-command/types";

export function ApprovalInboxPanel({
  actionCenter,
}: {
  actionCenter: ExecutiveActionCenter | null | undefined;
}) {
  const pending = actionCenter?.pending_approvals ?? 0;
  const drafts = actionCenter?.recent_items ?? [];
  const topApproval =
    drafts.find((item) => item.status === "pending_approval") ??
    drafts.find((item) => item.status === "draft") ??
    null;

  return (
    <details className="group overflow-hidden rounded-2xl border border-[#b4141e]/20 bg-[#060405]/90" open>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 marker:content-none">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#e87a82]">
          Approval Inbox · {pending} pending
        </span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 group-open:hidden">Open</span>
        <span className="hidden text-[10px] uppercase tracking-[0.12em] text-zinc-500 group-open:inline">
          Close
        </span>
      </summary>
      <div className="space-y-3 border-t border-[#b4141e]/15 px-4 py-3">
        {topApproval ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.14em] text-amber-200">Highest priority</p>
            <p className="mt-1 text-sm font-medium text-white">{topApproval.title}</p>
            <p className="mt-1 text-xs text-zinc-400">{topApproval.reason}</p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No pending action drafts right now.</p>
        )}

        {drafts.length > 0 ? (
          <ul className="space-y-1.5 text-sm text-zinc-300">
            {drafts.slice(0, 4).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{item.title}</span>
                <span className="shrink-0 text-[10px] uppercase tracking-[0.1em] text-zinc-500">
                  {item.status.replaceAll("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <Link
          href="/admin/nexus/actions"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#b4141e]/45 bg-[#b4141e]/10 px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-[#f1c3c7] transition hover:bg-[#b4141e]/20"
        >
          Review Approvals
        </Link>
      </div>
    </details>
  );
}
