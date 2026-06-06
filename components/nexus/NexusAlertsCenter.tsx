"use client";

import { useMemo, useState } from "react";
import type { NexusAlertSummaryRow, NexusAlertsSummary } from "@/lib/alerts/types";
import { formatDateTime, formatRelativeTime } from "@/lib/nexus/format";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { useNexusMutation } from "@/hooks/nexus/useNexusMutation";
import {
  NexusActionButton,
  NexusListEmpty,
  NexusPanel,
  NexusSectionFrame,
  NexusTabFilter,
} from "@/components/nexus/NexusShared";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";

type AlertTab = "active" | "acknowledged" | "resolved";

function isInvestigating(alert: NexusAlertSummaryRow) {
  return alert.metadata?.investigating === true;
}

export function NexusAlertsCenter() {
  const { data, error, loading, refresh } = useNexusFetch<NexusAlertsSummary>("/api/nexus/alerts");
  const { mutate, isPending } = useNexusMutation();
  const [tab, setTab] = useState<AlertTab>("active");

  const active = data?.active ?? [];
  const history = data?.recent_history ?? [];

  const filtered = useMemo(() => {
    if (tab === "active") {
      return active.filter((alert) => alert.status === "active" && !isInvestigating(alert));
    }

    if (tab === "acknowledged") {
      return active.filter(
        (alert) => alert.status === "acknowledged" || isInvestigating(alert),
      );
    }

    return history;
  }, [active, history, tab]);

  async function runAction(
    alertId: string,
    body: Record<string, unknown>,
    actionKey: string,
  ) {
    const result = await mutate(`/api/nexus/alerts/${alertId}`, body, actionKey);
    if (result.ok) {
      await refresh();
    }
  }

  const tabs = [
    {
      id: "active" as const,
      label: "Active",
      count: active.filter((alert) => alert.status === "active" && !isInvestigating(alert)).length,
    },
    {
      id: "acknowledged" as const,
      label: "Acknowledged",
      count: active.filter(
        (alert) => alert.status === "acknowledged" || isInvestigating(alert),
      ).length,
    },
    { id: "resolved" as const, label: "Resolved", count: history.length },
  ];

  return (
    <NexusSectionFrame
      title="Alert Center"
      description="Triage platform alerts by impact, acknowledge investigations, and resolve or suppress noise."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      {!loading ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Active queue", value: data?.counts.active ?? 0 },
              { label: "Critical", value: data?.counts.critical ?? 0 },
              { label: "Warning", value: data?.counts.warning ?? 0 },
              { label: "Info", value: data?.counts.info ?? 0 },
              { label: "Recovery", value: data?.counts.recovery ?? 0 },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-black/30 p-4"
              >
                <p className="text-2xl font-semibold text-white">{item.value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          <NexusTabFilter tabs={tabs} value={tab} onChange={setTab} />

          {filtered.length === 0 ? (
            <NexusListEmpty
              title={`No ${tab} alerts`}
              description="The alert queue is clear for this filter."
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((alert) => {
                const actionPrefix = `alert-${alert.id}`;

                return (
                  <NexusPanel key={alert.id}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <NexusStatusBadge label={alert.severity} />
                          <NexusStatusBadge label={alert.status} tone="neutral" />
                          {isInvestigating(alert) ? (
                            <NexusStatusBadge label="investigating" tone="warning" />
                          ) : null}
                          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                            {alert.category}
                          </span>
                          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                            Impact {alert.impact_score}
                          </span>
                        </div>
                        <p className="mt-3 text-lg font-medium text-white">{alert.title}</p>
                        <p className="mt-2 text-sm leading-6 text-zinc-400">{alert.message}</p>
                        <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                          Opened {formatRelativeTime(alert.created_at)} · Updated{" "}
                          {formatDateTime(alert.updated_at)}
                        </p>
                      </div>

                      {tab !== "resolved" ? (
                        <div className="flex flex-wrap gap-2">
                          {alert.status === "active" ? (
                            <>
                              <NexusActionButton
                                label={isPending(`${actionPrefix}-ack`) ? "Saving" : "Acknowledge"}
                                disabled={isPending(`${actionPrefix}-ack`)}
                                variant="primary"
                                onClick={() =>
                                  void runAction(
                                    alert.id,
                                    { status: "acknowledged" },
                                    `${actionPrefix}-ack`,
                                  )
                                }
                              />
                              <NexusActionButton
                                label={
                                  isPending(`${actionPrefix}-investigate`) ? "Saving" : "Investigating"
                                }
                                disabled={isPending(`${actionPrefix}-investigate`)}
                                onClick={() =>
                                  void runAction(
                                    alert.id,
                                    { investigating: true },
                                    `${actionPrefix}-investigate`,
                                  )
                                }
                              />
                            </>
                          ) : null}
                          <NexusActionButton
                            label={isPending(`${actionPrefix}-resolve`) ? "Saving" : "Resolve"}
                            disabled={isPending(`${actionPrefix}-resolve`)}
                            onClick={() =>
                              void runAction(
                                alert.id,
                                { status: "resolved" },
                                `${actionPrefix}-resolve`,
                              )
                            }
                          />
                          <NexusActionButton
                            label={isPending(`${actionPrefix}-suppress`) ? "Saving" : "Suppress"}
                            disabled={isPending(`${actionPrefix}-suppress`)}
                            variant="danger"
                            onClick={() =>
                              void runAction(
                                alert.id,
                                { status: "suppressed" },
                                `${actionPrefix}-suppress`,
                              )
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  </NexusPanel>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </NexusSectionFrame>
  );
}
