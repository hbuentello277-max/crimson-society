import { Suspense } from "react";
import Link from "next/link";
import { CrimsonCoinIcon } from "@/components/credits/CrimsonCoinIcon";
import { ProfileMenuBackLink } from "@/components/navigation/ProfileMenuBackLink";

type Props = {
  title: string;
  description: string;
};

export function CreditsPlaceholderPage({ title, description }: Props) {
  return (
    <main className="min-h-screen bg-[#050505] px-6 py-14 text-white">
      <div className="mx-auto max-w-lg">
        <Suspense
          fallback={
            <Link
              href="/profile"
              className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 transition hover:text-[#e87a82]"
            >
              ← Back to Profile
            </Link>
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
        <h1 className="mt-3 font-serif text-4xl text-white">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-400">{description}</p>
        <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs uppercase tracking-[0.16em] text-zinc-500">
          Coming soon
        </p>
      </div>
    </main>
  );
}
