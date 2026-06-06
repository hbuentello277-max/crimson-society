"use client";

import { useId, useState, type ReactNode } from "react";

type AdminAccordionSectionProps = {
  title: string;
  summary?: string;
  eyebrow?: string;
  description?: string;
  defaultOpen?: boolean;
  id?: string;
  headerAction?: ReactNode;
  children: ReactNode;
};

export function AdminAccordionSection({
  title,
  summary,
  eyebrow,
  description,
  defaultOpen = false,
  id,
  headerAction,
  children,
}: AdminAccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const headingId = useId();
  const panelId = useId();

  return (
    <section id={id} className="mt-6 overflow-hidden rounded-2xl border border-[#b4141e]/20 bg-[#060405]/80">
      <button
        type="button"
        id={headingId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-start justify-between gap-3 p-5 text-left transition hover:bg-[#b4141e]/5 md:p-6"
      >
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#e87a82]">{eyebrow}</p>
          ) : null}
          <div className={`flex flex-wrap items-center gap-3 ${eyebrow ? "mt-1" : ""}`}>
            <h2 className="font-serif text-2xl text-white">{title}</h2>
            {summary ? (
              <span className="rounded-full border border-[#b4141e]/25 bg-black/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                {summary}
              </span>
            ) : null}
          </div>
          {description && !open ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          {headerAction ? (
            <div
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {headerAction}
            </div>
          ) : null}
          <span
            aria-hidden
            className={`text-xs text-zinc-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            ▼
          </span>
        </div>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        className={`grid border-t border-[#b4141e]/15 transition-[grid-template-rows] duration-200 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-5 pb-5 pt-4 md:px-6 md:pb-6">{children}</div>
        </div>
      </div>
    </section>
  );
}
