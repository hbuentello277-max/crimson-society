"use client";

import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] flex items-center justify-center px-6 py-12 text-white">
      {/* Ambient crimson glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(180,20,30,0.22), transparent 60%), radial-gradient(ellipse 50% 40% at 50% 100%, rgba(120,10,20,0.18), transparent 60%)",
        }}
      />
      {/* Film grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="relative rounded-sm border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-10 shadow-[0_30px_80px_-20px_rgba(180,20,30,0.4)] backdrop-blur-sm">
          {/* Crimson hairline accent */}
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#b4141e] to-transparent" />

          {/* Monogram */}
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#b4141e]/40 bg-black">
              <span className="font-serif text-xl italic text-[#b4141e]">CS</span>
            </div>
          </div>

          {/* Wordmark */}
          <div className="mt-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.5em] text-zinc-500">
              Members Only
            </p>
            <h1 className="mt-4 font-serif text-4xl font-light tracking-wide text-white">
              Crimson <span className="italic text-[#b4141e]">Society</span>
            </h1>

            {/* Ornament */}
            <div className="mt-5 flex items-center justify-center gap-3">
              <span className="h-px w-10 bg-white/15" />
              <span className="text-[10px] tracking-[0.4em] text-[#b4141e]">✦</span>
              <span className="h-px w-10 bg-white/15" />
            </div>

            <p className="mt-4 text-[11px] tracking-[0.35em] uppercase text-zinc-400">
              Welcome Back
            </p>
          </div>

          {/* Form */}
          <form className="mt-10 flex flex-col gap-5">
            <div>
              <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                Email
              </label>
              <input
                type="email"
                placeholder="member@crimsonsociety.cc"
                className="w-full rounded-sm border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#b4141e]/60 focus:ring-1 focus:ring-[#b4141e]/40"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                  Password
                </label>
                <Link
                  href="/forgot"
                  className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 transition hover:text-[#b4141e]"
                >
                  Forgot
                </Link>
              </div>
              <input
                type="password"
                placeholder="••••••••••"
                className="w-full rounded-sm border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#b4141e]/60 focus:ring-1 focus:ring-[#b4141e]/40"
              />
            </div>

            <Link
              href="/dashboard"
              className="group relative mt-4 inline-flex w-full items-center justify-center overflow-hidden rounded-sm bg-gradient-to-b from-[#b4141e] to-[#7a0d14] px-6 py-4 text-[11px] uppercase tracking-[0.45em] text-white shadow-[0_18px_40px_-12px_rgba(180,20,30,0.7)] transition hover:from-[#c8161f] hover:to-[#8a0e16]"
            >
              <span className="relative z-10 flex items-center gap-3">
                Enter Society
                <span className="transition group-hover:translate-x-0.5">→</span>
              </span>
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />
              <span aria-hidden className="absolute inset-x-6 top-0 h-px bg-white/30" />
            </Link>
          </form>

          {/* Footer link */}
          <p className="mt-8 text-center text-[11px] tracking-[0.2em] text-zinc-500">
            New here?{" "}
            <Link
              href="/signup"
              className="text-zinc-200 underline-offset-4 transition hover:text-[#b4141e] hover:underline"
            >
              Request Access
            </Link>
          </p>
        </div>

        {/* Sub-footer */}
        <p className="mt-6 text-center text-[9px] uppercase tracking-[0.5em] text-zinc-600">
          Ride · Brotherhood · Legacy
        </p>
      </div>
    </main>
  );
}