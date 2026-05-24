"use client";

type Props = {
  onBack: () => void;
};

export default function BlackcardDashboard({ onBack }: Props) {
  const sections = [
    "Exclusive drops",
    "Discounted merch",
    "Early access collections",
    "Member-only rides",
    "Reserved ride spots",
    "Future loyalty rewards",
    "Future private chats",
    "Premium profile badge",
  ];

  return (
    <section className="mt-8 overflow-hidden rounded-[32px] border border-[#b4141e]/20 bg-gradient-to-b from-[#111113] via-[#0b0b0d] to-[#060606] shadow-[0_24px_80px_-40px_rgba(0,0,0,0.95)]">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(180,20,30,0.18),transparent_45%)] px-6 py-8 md:px-8 md:py-10">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]"
        >
          Back
        </button>

        <p className="mt-8 text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">
          Apex Members
        </p>

        <h1 className="mt-4 font-serif text-5xl leading-none text-white md:text-6xl">
          Blackcard Access Granted
        </h1>

        <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400">
          A private tier of access reserved for members with first claim on
          releases, protected ride placement, and future privileges kept beyond
          the public floor.
        </p>
      </div>

      <div className="grid gap-4 px-6 py-8 md:grid-cols-2 md:px-8 xl:grid-cols-3">
        {sections.map((section) => (
          <div
            key={section}
            className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
              Apex
            </p>
            <h2 className="mt-3 font-serif text-2xl text-white">{section}</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              Placeholder for premium access, upcoming releases, and member-only
              experiences.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}