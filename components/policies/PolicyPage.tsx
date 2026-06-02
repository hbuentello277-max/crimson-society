import Link from "next/link";
import SupportContactSection from "@/components/policies/SupportContactSection";

type PolicySection = {
  title: string;
  body: string[];
};

type PolicyPageProps = {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: PolicySection[];
  includeSupportContact?: boolean;
};

const policyLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/community-guidelines", label: "Guidelines" },
  { href: "/safety", label: "Safety" },
];

export default function PolicyPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
  includeSupportContact = false,
}: PolicyPageProps) {
  return (
    <main className="min-h-screen bg-[#050505] px-5 pb-28 pt-[calc(env(safe-area-inset-top)+2rem)] text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/profile"
          className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 transition hover:text-[#e87a82]"
        >
          Back to Profile
        </Link>

        <header className="mt-8 border-b border-white/10 pb-7">
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">{eyebrow}</p>
          <h1 className="mt-3 font-serif text-4xl leading-none text-white sm:text-5xl">{title}</h1>
          <p className="mt-4 text-sm uppercase tracking-[0.22em] text-zinc-500">Last updated {updated}</p>
          <p className="mt-5 text-base leading-7 text-zinc-300">{intro}</p>
        </header>

        <nav className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {policyLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center text-[10px] uppercase tracking-[0.18em] text-zinc-400 transition hover:border-[#b4141e]/50 hover:text-[#e87a82]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-8 space-y-5">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <h2 className="font-serif text-2xl text-white">{section.title}</h2>
              <div className="mt-4 space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-zinc-400">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {includeSupportContact && (
          <div className="mt-5">
            <SupportContactSection />
          </div>
        )}

        <footer className="mt-10 rounded-2xl border border-[#b4141e]/25 bg-[#b4141e]/10 p-5">
          <p className="text-sm leading-7 text-[#f1c3c7]">
            These draft launch policies are written for Crimson Society beta readiness and should be
            reviewed by counsel before broad public launch or App Store submission.
          </p>
        </footer>
      </div>
    </main>
  );
}
