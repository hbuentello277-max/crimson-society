"use client";

import type { BriefingSection } from "@/lib/briefings/types";

export function BriefingSectionBlock({ section }: { section: BriefingSection }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#e87a82]">{section.title}</p>
      <ul className="space-y-2">
        {section.lines.map((line) => (
          <li key={line} className="text-sm leading-6 text-zinc-200">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
