import Link from "next/link";
import type { ReactNode } from "react";

type AuthPageShellProps = {
  eyebrow?: string;
  title: string;
  titleAccent?: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthPageShell({
  eyebrow = "Members Only",
  title,
  titleAccent,
  subtitle,
  children,
  footer,
}: AuthPageShellProps) {
  const [titleLead, titleTail] = titleAccent
    ? [title, titleAccent]
    : [title.split(" ")[0] ?? title, title.split(" ").slice(1).join(" ")];

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-6 py-12 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(180,20,30,0.22), transparent 60%), radial-gradient(ellipse 50% 40% at 50% 100%, rgba(120,10,20,0.18), transparent 60%)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="relative rounded-sm border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-10 shadow-[0_30px_80px_-20px_rgba(180,20,30,0.4)] backdrop-blur-sm">
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#b4141e] to-transparent" />

          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#b4141e]/40 bg-black">
              <span className="font-serif text-xl italic text-[#b4141e]">CS</span>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.5em] text-zinc-500">{eyebrow}</p>
            <h1 className="mt-4 font-serif text-4xl font-light tracking-wide text-white">
              {titleAccent ? (
                <>
                  {titleLead}{" "}
                  <span className="italic text-[#b4141e]">{titleTail}</span>
                </>
              ) : (
                title
              )}
            </h1>

            <div className="mt-5 flex items-center justify-center gap-3">
              <span className="h-px w-10 bg-white/15" />
              <span className="text-[10px] tracking-[0.4em] text-[#b4141e]">✦</span>
              <span className="h-px w-10 bg-white/15" />
            </div>

            <p className="mt-4 text-[11px] uppercase tracking-[0.35em] text-zinc-400">{subtitle}</p>
          </div>

          {children}
        </div>

        {footer ?? (
          <p className="mt-6 text-center text-[9px] uppercase tracking-[0.5em] text-zinc-600">
            Ride · Community · Legacy
          </p>
        )}
      </div>
    </main>
  );
}

type AuthMessageProps = {
  children: ReactNode;
  tone?: "default" | "success";
};

export function AuthMessage({ children, tone = "default" }: AuthMessageProps) {
  const borderClass =
    tone === "success" ? "border-emerald-500/30 bg-emerald-500/10" : "border-[#b4141e]/20 bg-[#b4141e]/10";

  return (
    <div className={`rounded-sm border px-4 py-3 text-sm text-zinc-200 ${borderClass}`}>{children}</div>
  );
}

export function AuthBackToLoginLink() {
  return (
    <p className="mt-8 text-center text-[11px] tracking-[0.2em] text-zinc-500">
      Remember your password?{" "}
      <Link
        href="/login"
        className="text-zinc-200 underline-offset-4 transition hover:text-[#b4141e] hover:underline"
      >
        Back to Login
      </Link>
    </p>
  );
}
