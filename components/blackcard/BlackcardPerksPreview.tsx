import Link from "next/link";

export const LOCKED_BLACKCARD_PERKS = [
  "Crimson Credits",
  "Early merch access",
  "Member-only rides",
  "Private Blackcard chat",
  "Priority ride access",
  "Limited merch reservations",
  "Exclusive drops/giveaways",
  "Coming soon rewards",
] as const;

type Props = {
  unlocked: boolean;
};

export function BlackcardPerksPreview({ unlocked }: Props) {
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
          {unlocked ? "Blackcard Preview" : "Locked Blackcard Preview"}
        </p>
        {!unlocked && (
          <Link
            href="/blackcard"
            className="text-[10px] uppercase tracking-[0.2em] text-[#d85f6c] transition hover:text-[#e87a82]"
          >
            Subscribe to unlock
          </Link>
        )}
      </div>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
        {unlocked
          ? "Your membership unlocks these premium layers across Crimson Society."
          : "Subscribe to Blackcard to unlock member-only rides, early access, and premium identity."}
      </p>

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
              {unlocked ? "Unlocked" : "Locked"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
