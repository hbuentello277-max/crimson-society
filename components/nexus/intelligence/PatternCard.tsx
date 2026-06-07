"use client";

import Link from "next/link";
import type { RepeatingPattern } from "@/lib/operational-intelligence/types";
import { NexusPanel } from "@/components/nexus/NexusShared";

export function PatternCard({ pattern }: { pattern: RepeatingPattern }) {
  return (
    <NexusPanel>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#e87a82]">
            {pattern.category}
          </span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            Confidence {pattern.confidence_score}
          </span>
        </div>
        <p className="break-words text-base font-medium text-white">{pattern.title}</p>
        <p className="break-words text-sm leading-6 text-zinc-400">{pattern.summary}</p>
        {pattern.evidence.length > 0 ? (
          <ul className="list-disc space-y-1 pl-4 text-sm text-zinc-500">
            {pattern.evidence.map((line) => (
              <li key={line} className="break-words">
                {line}
              </li>
            ))}
          </ul>
        ) : null}
        {pattern.related_routes[0] ? (
          <Link
            href={pattern.related_routes[0]}
            className="inline-flex text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7]"
          >
            Explore related signals
          </Link>
        ) : null}
      </div>
    </NexusPanel>
  );
}
