"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { NexusLoadingPanel } from "@/components/nexus/NexusShared";

function lazyCenter<T extends Record<string, ComponentType<unknown>>>(
  loader: () => Promise<T>,
  exportName: keyof T,
) {
  return dynamic(
    () => loader().then((mod) => ({ default: mod[exportName] as ComponentType<unknown> })),
    { loading: () => <NexusLoadingPanel rows={3} /> },
  );
}

export const LazyNexusMissionControlCenter = lazyCenter(
  () => import("@/components/nexus/NexusMissionControlCenter"),
  "NexusMissionControlCenter",
);
export const LazyNexusChatCenter = lazyCenter(
  () => import("@/components/nexus/NexusChatCenter"),
  "NexusChatCenter",
);
export const LazyNexusVoiceCenter = lazyCenter(
  () => import("@/components/nexus/NexusVoiceCenter"),
  "NexusVoiceCenter",
);
export const LazyNexusAIAnalysisCenter = lazyCenter(
  () => import("@/components/nexus/NexusAIAnalysisCenter"),
  "NexusAIAnalysisCenter",
);
export const LazyNexusScenarioCenter = lazyCenter(
  () => import("@/components/nexus/NexusScenarioCenter"),
  "NexusScenarioCenter",
);
export const LazyNexusDecisionEngineCenter = lazyCenter(
  () => import("@/components/nexus/NexusDecisionEngineCenter"),
  "NexusDecisionEngineCenter",
);
export const LazyNexusOperationalIntelligenceCenter = lazyCenter(
  () => import("@/components/nexus/NexusOperationalIntelligenceCenter"),
  "NexusOperationalIntelligenceCenter",
);
export const LazyNexusCopilotCenter = lazyCenter(
  () => import("@/components/nexus/mobile-copilot/MobileCopilotCenter"),
  "MobileCopilotCenter",
);
export const LazyNexusForecastingCenter = lazyCenter(
  () => import("@/components/nexus/NexusForecastingCenter"),
  "NexusForecastingCenter",
);
export const LazyNexusOperatorCenter = lazyCenter(
  () => import("@/components/nexus/NexusOperatorCenter"),
  "NexusOperatorCenter",
);
export const LazyNexusAutomationCenter = lazyCenter(
  () => import("@/components/nexus/NexusAutomationCenter"),
  "NexusAutomationCenter",
);
export const LazyNexusPlanningCenter = lazyCenter(
  () => import("@/components/nexus/NexusPlanningCenter"),
  "NexusPlanningCenter",
);
export const LazyNexusCorrelationsCenter = lazyCenter(
  () => import("@/components/nexus/NexusCorrelationsCenter"),
  "NexusCorrelationsCenter",
);
export const LazyNexusMemoryCenter = lazyCenter(
  () => import("@/components/nexus/NexusMemoryCenter"),
  "NexusMemoryCenter",
);
