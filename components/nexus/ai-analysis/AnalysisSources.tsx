"use client";

import Link from "next/link";
import { ANALYSIS_SOURCE_ROUTES } from "@/lib/ai-analysis/prompts";
import type { AnalysisSource } from "@/lib/ai-analysis/types";

type AnalysisSourcesProps = {
  sources: AnalysisSource[];
  relatedRoutes: string[];
  confidence?: number;
};

function routeLabel(route: string): string {
  const segment = route.split("/").filter(Boolean).pop() ?? route;
  return segment.replace(/-/g, " ");
}

export function AnalysisSources({ sources, relatedRoutes, confidence }: AnalysisSourcesProps) {
  const routes = [...new Set(relatedRoutes)];

  return (
    <div className="min-w-0 space-y-3">
      {confidence != null ? (
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
          Confidence <span className="text-[#f1c3c7]">{confidence}</span>
        </p>
      ) : null}

      {sources.length > 0 ? (
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Sources</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {sources.map((source) => {
              const href = ANALYSIS_SOURCE_ROUTES[source];
              return (
                <li key={source}>
                  {href ? (
                    <Link
                      href={href}
                      className="inline-flex max-w-full break-words rounded-md border border-[#b4141e]/20 bg-[#0a0608]/80 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-zinc-400 transition hover:border-[#b4141e]/40 hover:text-[#f1c3c7]"
                    >
                      {source}
                    </Link>
                  ) : (
                    <span className="inline-flex rounded-md border border-[#b4141e]/20 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-zinc-500">
                      {source}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {routes.length > 0 ? (
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Related</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {routes.map((route) => (
              <li key={route}>
                <Link
                  href={route}
                  className="inline-flex max-w-full break-words rounded-md border border-[#b4141e]/25 bg-[#b4141e]/10 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-[#f1c3c7] transition hover:bg-[#b4141e]/20"
                >
                  {routeLabel(route)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
