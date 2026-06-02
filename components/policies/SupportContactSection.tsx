import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";

export default function SupportContactSection() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <h2 className="font-serif text-2xl text-white">Support / Contact</h2>
      <p className="mt-4 text-sm leading-7 text-zinc-400">
        For account help, safety concerns, deletion requests, or moderation questions, contact:{" "}
        <a
          href={SUPPORT_MAILTO}
          className="text-[#e87a82] underline decoration-[#b4141e]/40 underline-offset-4 transition hover:text-[#f1c3c7]"
        >
          {SUPPORT_EMAIL}
        </a>
      </p>
    </section>
  );
}
