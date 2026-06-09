"use client";

import { Suspense, type ReactNode } from "react";
import { CrimsonCoinIcon } from "@/components/credits/CrimsonCoinIcon";
import { ProfileMenuBackLink } from "@/components/navigation/ProfileMenuBackLink";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function CreditsPageShell({ title, subtitle, children }: Props) {
  return (
    <main className="min-h-screen bg-[#050505] px-4 py-12 text-white sm:px-6 sm:py-14">
      <div className="mx-auto max-w-lg">
        <Suspense
          fallback={
            <span className="text-[10px] uppercase tracking-[0.28em] text-zinc-600">← Back</span>
          }
        >
          <ProfileMenuBackLink className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 transition hover:text-[#e87a82]">
            ← Back to Profile
          </ProfileMenuBackLink>
        </Suspense>

        <div className="mt-8 flex items-center gap-2.5">
          <CrimsonCoinIcon size={24} className="drop-shadow-[0_0_10px_rgba(180,20,30,0.4)]" />
          <p className="text-[10px] uppercase tracking-[0.32em] text-[#e87a82]">Crimson Credits</p>
        </div>
        <h1 className="mt-3 font-serif text-3xl text-white sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-3 text-sm leading-7 text-zinc-400">{subtitle}</p> : null}

        <div className="mt-6 space-y-4">{children}</div>
      </div>
    </main>
  );
}
