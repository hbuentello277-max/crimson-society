"use client";

import { AnalysisSources } from "@/components/nexus/ai-analysis/AnalysisSources";
import type { AnalysisSource } from "@/lib/ai-analysis/types";

type AnalysisTurn = {
  message: string;
  analysis?: string;
  sources?: AnalysisSource[];
  related_routes?: string[];
  confidence?: number;
};

export function AnalysisResponse({ turn }: { turn: AnalysisTurn }) {
  return (
    <div className="flex justify-start">
      <div className="min-w-0 max-w-[95%] rounded-2xl border border-[#b4141e]/20 bg-[#060405]/95 px-3 py-3 sm:max-w-[85%] sm:px-4">
        <p className="text-[9px] uppercase tracking-[0.22em] text-[#e87a82]">Nexus AI</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
          Re: {turn.message}
        </p>
        <p className="mt-2 break-words text-sm leading-6 text-zinc-200">
          {turn.analysis || "Data unavailable."}
        </p>

        <div className="mt-3 border-t border-[#b4141e]/15 pt-3">
          <AnalysisSources
            sources={turn.sources ?? []}
            relatedRoutes={turn.related_routes ?? []}
            confidence={turn.confidence}
          />
        </div>
      </div>
    </div>
  );
}
