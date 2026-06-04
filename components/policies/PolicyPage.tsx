import { Suspense } from "react";
import Link from "next/link";
import { ProfileMenuBackLink } from "@/components/navigation/ProfileMenuBackLink";
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
  { href: "/account-deletion", label: "Deletion" },
  { href: "/community-guidelines", label: "Guidelines" },
  { href: "/safety", label: "Safety" },
  { href: "/support", label: "Support" },
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
        <Suspense
          fallback={
            <Link
              href="/profile"
              className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 transition hover:text-[#e87a82]"
            >
              Back to Profile
            </Link>
          }
        >
          <ProfileMenuBackLink className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 transition hover:text-[#e87a82]">
            Back to Profile
          </ProfileMenuBackLink>
        </Suspense>

        <header className="mt-8 border-b border-white/10 pb-7">
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">{eyebrow}</p>
          <h1 className="mt-3 font-serif text-4xl leading-none text-white sm:text-5xl">{title}</h1>
          <p className="mt-4 text-sm uppercase tracking-[0.22em] text-zinc-500">
            Last updated {updated}
          </p>
          <p className="mt-5 text-base leading-7 text-zinc-300">{intro}</p>
        </header>

        <nav className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
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
      </div>
    </main>
  );
}
