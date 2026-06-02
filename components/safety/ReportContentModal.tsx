"use client";

import { useEffect, useState } from "react";

type ReportContentModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  reasons: readonly string[];
  busy?: boolean;
  onClose: () => void;
  onSubmit: (payload: { reason: string; details: string }) => Promise<void> | void;
};

export function ReportContentModal({
  open,
  title,
  subtitle,
  reasons,
  busy = false,
  onClose,
  onSubmit,
}: ReportContentModalProps) {
  const [reason, setReason] = useState(reasons[0] ?? "Other");
  const [details, setDetails] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason(reasons[0] ?? "Other");
    setDetails("");
  }, [open, reasons]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0b0d] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Report</p>
            <h2 className="mt-2 font-serif text-2xl text-white">{title}</h2>
            {subtitle ? (
              <p className="mt-2 text-sm leading-6 text-zinc-400">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-400 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <label className="mt-5 block text-[10px] uppercase tracking-[0.24em] text-zinc-500">
          Reason
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={busy}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm normal-case tracking-normal text-white outline-none disabled:opacity-50"
          >
            {reasons.map((option) => (
              <option key={option} className="bg-black" value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-[10px] uppercase tracking-[0.24em] text-zinc-500">
          Details
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={4}
            maxLength={2000}
            disabled={busy}
            placeholder="Optional context for moderators"
            className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm normal-case tracking-normal text-white outline-none placeholder:text-zinc-600 disabled:opacity-50"
          />
        </label>

        <button
          type="button"
          onClick={() => void onSubmit({ reason, details })}
          disabled={busy}
          className="mt-5 w-full rounded-xl border border-[#b4141e]/60 bg-[#b4141e]/20 py-3 text-[10px] uppercase tracking-[0.22em] text-[#f1c3c7] transition hover:bg-[#b4141e]/30 disabled:opacity-60"
        >
          {busy ? "Submitting" : "Submit Report"}
        </button>
      </div>
    </div>
  );
}
