"use client";

import { IconCheck, IconDoubleCheck } from "@/components/inbox/inbox-icons";
import type { ReadReceiptState } from "@/lib/messages/read-receipts";

const RECEIPT_LABELS: Record<ReadReceiptState, string> = {
  sent: "Sent",
  delivered: "Delivered",
  seen: "Seen",
};

type ReadReceiptIndicatorProps = {
  state: ReadReceiptState;
};

export function ReadReceiptIndicator({ state }: ReadReceiptIndicatorProps) {
  if (state === "sent") {
    return (
      <span className="inline-flex items-center gap-0.5 text-zinc-500" title={RECEIPT_LABELS.sent}>
        <IconCheck className="h-3 w-3" />
      </span>
    );
  }

  if (state === "delivered") {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-zinc-400"
        title={RECEIPT_LABELS.delivered}
      >
        <IconDoubleCheck className="h-3 w-3 text-zinc-400" />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-[#e87a82]" title={RECEIPT_LABELS.seen}>
      <IconDoubleCheck className="h-3 w-3 text-[#e87a82]" />
    </span>
  );
}
