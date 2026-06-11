"use client";

import { ACTION_TYPE_LABELS } from "@/lib/action-center/constants";
import type { NexusActionCard } from "@/lib/action-center/types";
import { formatNexusDisplayText } from "@/lib/nexus/terminology";

type Props = {
  action: NexusActionCard;
  pending?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onExecute?: () => void;
  onEdit?: (patch: {
    title: string;
    summary: string;
    reason: string;
    suggested_outcome: string;
    generated_content: string;
  }) => void;
};

const STATUS_LABELS: Record<NexusActionCard["status"], string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  executed: "Executed",
  rejected: "Rejected",
};

export function ActionCard({
  action,
  pending = false,
  onApprove,
  onReject,
  onExecute,
  onEdit,
}: Props) {
  const canReview = ["draft", "pending_approval", "approved"].includes(action.status);
  const canExecute = action.status === "approved";

  return (
    <article className="rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#e87a82]">
            {ACTION_TYPE_LABELS[action.action_type]}
          </p>
          <h3 className="mt-1 font-serif text-xl text-white">{formatNexusDisplayText(action.title)}</h3>
          <p className="mt-1 text-sm text-zinc-400">{formatNexusDisplayText(action.summary)}</p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-zinc-300">
          {STATUS_LABELS[action.status]}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoBlock title="Reason" value={formatNexusDisplayText(action.reason)} />
        <InfoBlock title="Suggested outcome" value={formatNexusDisplayText(action.suggested_outcome)} />
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Generated content</p>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-zinc-200">
          {formatNexusDisplayText(action.generated_content)}
        </pre>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
        <span>Created by {action.created_by_label}</span>
        <span>·</span>
        <span>{new Date(action.created_at).toLocaleString()}</span>
        {action.approval_required ? (
          <>
            <span>·</span>
            <span>Approval required</span>
          </>
        ) : null}
      </div>

      {canReview && onEdit ? (
        <details className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <summary className="cursor-pointer text-[10px] uppercase tracking-[0.16em] text-zinc-400">
            Edit draft
          </summary>
          <ActionEditForm action={action} pending={pending} onSave={onEdit} />
        </details>
      ) : null}

      {canReview ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {onApprove && ["draft", "pending_approval"].includes(action.status) ? (
            <button
              type="button"
              disabled={pending}
              onClick={onApprove}
              className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-emerald-200 disabled:opacity-50"
            >
              Approve
            </button>
          ) : null}
          {onReject && action.status !== "rejected" && action.status !== "executed" ? (
            <button
              type="button"
              disabled={pending}
              onClick={onReject}
              className="rounded-full border border-red-500/35 bg-red-500/10 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-red-200 disabled:opacity-50"
            >
              Reject
            </button>
          ) : null}
          {onExecute && canExecute ? (
            <button
              type="button"
              disabled={pending}
              onClick={onExecute}
              className="rounded-full border border-[#b4141e]/45 bg-[#b4141e]/12 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7] disabled:opacity-50"
            >
              Mark executed
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function InfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{value}</p>
    </div>
  );
}

function ActionEditForm({
  action,
  pending,
  onSave,
}: {
  action: NexusActionCard;
  pending: boolean;
  onSave: Props["onEdit"];
}) {
  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        onSave?.({
          title: (form.elements.namedItem("title") as HTMLInputElement).value,
          summary: (form.elements.namedItem("summary") as HTMLTextAreaElement).value,
          reason: (form.elements.namedItem("reason") as HTMLTextAreaElement).value,
          suggested_outcome: (form.elements.namedItem("suggested_outcome") as HTMLTextAreaElement)
            .value,
          generated_content: (form.elements.namedItem("generated_content") as HTMLTextAreaElement)
            .value,
        });
      }}
    >
      <Field name="title" label="Title" defaultValue={action.title} />
      <TextArea name="summary" label="Summary" defaultValue={action.summary} />
      <TextArea name="reason" label="Reason" defaultValue={action.reason} />
      <TextArea
        name="suggested_outcome"
        label="Suggested outcome"
        defaultValue={action.suggested_outcome}
      />
      <TextArea
        name="generated_content"
        label="Generated content"
        defaultValue={action.generated_content}
        rows={8}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-zinc-200 disabled:opacity-50"
      >
        Save edits
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
      />
    </label>
  );
}

function TextArea({
  name,
  label,
  defaultValue,
  rows = 3,
}: {
  name: string;
  label: string;
  defaultValue: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</span>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
      />
    </label>
  );
}
