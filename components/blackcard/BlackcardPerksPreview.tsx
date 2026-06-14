"use client";

import Link from "next/link";

import { useI18n } from "@/components/LanguageProvider";
import { CrimsonRewardsIcon } from "@/components/credits/CrimsonRewardsIcon";
import { BLACKCARD_MEMBERSHIP_PERKS } from "@/lib/blackcard/perks";

export const LOCKED_BLACKCARD_PERKS = [...BLACKCARD_MEMBERSHIP_PERKS] as const;

type Props = {
  unlocked: boolean;
};

export function BlackcardPerksPreview({ unlocked }: Props) {
  const { dictionary } = useI18n();
  const copy = dictionary.blackcard;

  return (
    <section
      className={`mt-8 rounded-[28px] border p-5 ${
        unlocked
          ? "border-[#b4141e]/25 bg-[#b4141e]/[0.04]"
          : "border-white/10 bg-white/[0.025]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className={`text-xs uppercase tracking-[0.28em] ${
            unlocked ? "text-[#e87a82]" : "text-red-400/80"
          }`}
        >
          {unlocked ? copy.preview : copy.lockedPreview}
        </p>
        {!unlocked && (
          <Link
            href="/blackcard"
            className="text-[10px] uppercase tracking-[0.2em] text-[#d85f6c] transition hover:text-[#e87a82]"
          >
            {copy.subscribeToUnlock}
          </Link>
        )}
      </div>

      <div className="mt-3 flex max-w-2xl items-start gap-2.5">
        <CrimsonRewardsIcon size={24} className="mt-0.5 shrink-0 drop-shadow-[0_0_10px_rgba(180,20,30,0.35)]" />
        <p className="text-sm leading-6 text-zinc-400">
          {unlocked
            ? copy.previewUnlockedDescription
            : copy.previewLockedDescription}
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {LOCKED_BLACKCARD_PERKS.map((perk) => (
          <div
            key={perk}
            className={`flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 ${
              unlocked
                ? "border-[#b4141e]/20 bg-black/20"
                : "border-white/10 bg-black/20"
            }`}
          >
            <span className="text-sm text-zinc-300">{perk}</span>
            <span
              className={`text-[10px] uppercase tracking-[0.2em] ${
                unlocked ? "text-[#e87a82]" : "text-zinc-600"
              }`}
            >
              {unlocked ? copy.unlocked : copy.locked}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
