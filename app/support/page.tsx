import { Suspense } from "react";
import Link from "next/link";
import { ProfileMenuBackLink } from "@/components/navigation/ProfileMenuBackLink";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";

const helpTopics = [
  {
    title: "Account help",
    body: "Sign-in issues, profile updates, membership questions, and general account access.",
  },
  {
    title: "Safety concerns",
    body: "Urgent harassment, threats, impersonation, or unsafe Meet behavior. For emergencies, contact local emergency services first.",
  },
  {
    title: "Report a problem",
    body: "App bugs, broken features, billing questions, or content that may violate community policies.",
  },
  {
    title: "Account deletion support",
    body: "Questions about pending deletion requests, review status, or what happens after a request is completed.",
  },
];

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#050505] px-5 pb-28 pt-[calc(env(safe-area-inset-top)+2rem)] text-white sm:px-6">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(180,20,30,0.25),transparent_65%)]" />
      <div className="relative mx-auto max-w-3xl">
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
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">
            Crimson Society
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-none text-white sm:text-5xl">
            Support
          </h1>
          <p className="mt-5 text-base leading-7 text-zinc-300">
            Contact Crimson Society for account help, safety concerns, moderation questions, and beta
            support during launch readiness.
          </p>
        </header>

        <section className="mt-8 rounded-2xl border border-[#b4141e]/30 bg-[#b4141e]/10 p-5">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">
            Contact email
          </p>
          <a
            href={SUPPORT_MAILTO}
            className="mt-3 inline-block break-all font-serif text-2xl text-white underline decoration-[#b4141e]/50 underline-offset-4 transition hover:text-[#f1c3c7]"
          >
            {SUPPORT_EMAIL}
          </a>
        </section>

        <div className="mt-6 space-y-4">
          {helpTopics.map((topic) => (
            <section
              key={topic.title}
              className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"
            >
              <h2 className="font-serif text-2xl text-white">{topic.title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{topic.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <h2 className="font-serif text-2xl text-white">Response time</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-400">
            We review safety and account requests as soon as possible during beta.
          </p>
        </section>

        <nav className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { href: "/safety", label: "Safety" },
            { href: "/privacy", label: "Privacy" },
            { href: "/terms", label: "Terms" },
            { href: "/community-guidelines", label: "Guidelines" },
          ].map((link) => (
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
      </div>
    </main>
  );
}
