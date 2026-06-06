"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { NexusRunbookSummaryRow, NexusRunbooksSummary } from "@/lib/runbooks/types";
import type { NexusRunbookCategory } from "@/lib/nexus/constants";
import { formatDateTime, formatRelativeTime } from "@/lib/nexus/format";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import {
  NexusListEmpty,
  NexusPanel,
  NexusSectionFrame,
  NexusTabFilter,
} from "@/components/nexus/NexusShared";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";
import { formatNexusDisplayText } from "@/lib/nexus/terminology";

type CategoryTab = "all" | NexusRunbookCategory;

const CATEGORY_TABS: Array<{ id: CategoryTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "user_workflows", label: "User Workflows" },
  { id: "revenue", label: "Revenue" },
  { id: "growth", label: "Growth" },
  { id: "security", label: "Security" },
  { id: "operations", label: "Operations" },
];

function categoryLabel(category: string) {
  return CATEGORY_TABS.find((tab) => tab.id === category)?.label ?? category;
}

export function NexusRunbooksCenter() {
  const [tab, setTab] = useState<CategoryTab>("all");
  const path =
    tab === "all" ? "/api/nexus/runbooks" : `/api/nexus/runbooks?category=${tab}`;
  const { data, error, loading, refresh } = useNexusFetch<NexusRunbooksSummary>(path);

  const runbooks = data?.runbooks ?? [];

  const tabs = useMemo(
    () =>
      CATEGORY_TABS.map((item) => ({
        ...item,
        count:
          item.id === "all"
            ? (data?.counts.all ?? 0)
            : (data?.counts[item.id] ?? 0),
      })),
    [data?.counts],
  );

  return (
    <NexusSectionFrame
      title="Runbooks"
      description="Operational playbooks for degraded systems, workflows, revenue, and incident response."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      {!loading ? (
        <>
          <NexusTabFilter tabs={tabs} value={tab} onChange={setTab} />

          {runbooks.length === 0 ? (
            <NexusListEmpty
              title="No runbooks in this category"
              description="Starter runbooks appear after the Phase 10 migration is applied."
            />
          ) : (
            <div className="space-y-3">
              {runbooks.map((runbook) => (
                <RunbookCard key={runbook.id} runbook={runbook} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </NexusSectionFrame>
  );
}

function RunbookCard({ runbook }: { runbook: NexusRunbookSummaryRow }) {
  return (
    <NexusPanel>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <NexusStatusBadge label={runbook.severity} />
            <NexusStatusBadge label={runbook.status} />
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              {categoryLabel(runbook.category)}
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              {runbook.trigger_count} triggers
            </span>
          </div>
          <p className="mt-3 text-lg font-medium text-white">
            {formatNexusDisplayText(runbook.title)}
          </p>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">
            {formatNexusDisplayText(runbook.description)}
          </p>
          <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            Updated {formatRelativeTime(runbook.updated_at)} ·{" "}
            {formatDateTime(runbook.updated_at)}
          </p>
        </div>

        <Link
          href={`/admin/nexus/runbooks/${runbook.id}`}
          className="inline-flex min-h-10 items-center rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7] transition hover:bg-[#b4141e]/25"
        >
          Open Runbook
        </Link>
      </div>
    </NexusPanel>
  );
}
