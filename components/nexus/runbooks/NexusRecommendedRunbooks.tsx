"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { RunbookSuggestion, RunbookSuggestionContext } from "@/lib/runbooks/types";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { NexusPanel } from "@/components/nexus/NexusShared";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";
import { formatNexusDisplayText } from "@/lib/nexus/terminology";

function categoryLabel(category: string) {
  return category.replaceAll("_", " ");
}

export function NexusRecommendedRunbooks({
  context,
  title = "Recommended Runbooks",
}: {
  context: RunbookSuggestionContext;
  title?: string;
}) {
  const query = useMemo(() => {
    const params = new URLSearchParams({ source: context.source });
    if (context.category) params.set("category", context.category);
    if (context.severity) params.set("severity", context.severity);
    if (context.rule_id) params.set("rule_id", context.rule_id);
    if (context.integration_slug) params.set("integration_slug", context.integration_slug);
    if (context.workflow_slug) params.set("workflow_slug", context.workflow_slug);
    if (context.title) params.set("title", context.title);
    return `/api/nexus/runbooks/suggestions?${params.toString()}`;
  }, [context]);

  const { data, loading, error } = useNexusFetch<{
    suggestions: RunbookSuggestion[];
  }>(query);

  const suggestions = data?.suggestions ?? [];

  if (loading) {
    return (
      <NexusPanel title={title}>
        <p className="text-sm text-zinc-500">Loading runbook suggestions...</p>
      </NexusPanel>
    );
  }

  if (error || suggestions.length === 0) {
    return null;
  }

  return (
    <NexusPanel title={title}>
      <div className="space-y-2">
        {suggestions.map((runbook) => (
          <Link
            key={runbook.id}
            href={`/admin/nexus/runbooks/${runbook.id}`}
            className="block rounded-xl border border-[#b4141e]/20 bg-[#0a0608]/80 p-3 transition hover:border-[#b4141e]/40 hover:bg-[#b4141e]/5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <NexusStatusBadge label={runbook.severity} variant="subtle" />
              <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                {categoryLabel(runbook.category)}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-white">
              {formatNexusDisplayText(runbook.title)}
            </p>
            <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
              {formatNexusDisplayText(runbook.description)}
            </p>
            {runbook.match_reasons.length > 0 ? (
              <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[#e87a82]">
                {runbook.match_reasons.slice(0, 2).join(" · ")}
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </NexusPanel>
  );
}
