"use client";

import { useI18n } from "@/components/LanguageProvider";
import { BLACKCARD_ACTIVE_PERKS } from "@/lib/blackcard/perks";

type Props = {
  onBack: () => void;
};

export default function BlackcardDashboard({ onBack }: Props) {
  const { dictionary } = useI18n();
  const copy = dictionary.blackcard;

  return (
    <section className="mt-8 overflow-hidden rounded-[32px] border border-[#b4141e]/20 bg-gradient-to-b from-[#111113] via-[#0b0b0d] to-[#060606] shadow-[0_24px_80px_-40px_rgba(0,0,0,0.95)]">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(180,20,30,0.18),transparent_45%)] px-6 py-8 md:px-8 md:py-10">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]"
        >
          {dictionary.common.back}
        </button>

        <p className="mt-8 text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">
          {copy.members}
        </p>

        <h1 className="mt-4 font-serif text-5xl leading-none text-white md:text-6xl">
          {copy.dashboardGranted}
        </h1>

        <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400">
          {copy.dashboardDescription}
        </p>
      </div>

      <div className="grid gap-4 px-6 py-8 md:grid-cols-2 md:px-8 xl:grid-cols-3">
        {BLACKCARD_ACTIVE_PERKS.map((section) => (
          <div
            key={section}
            className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
              {copy.title}
            </p>
            <h2 className="mt-3 font-serif text-2xl text-white">{section}</h2>
          </div>
        ))}
      </div>
    </section>
  );
}
