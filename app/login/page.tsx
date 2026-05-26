"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
  const [showResend, setShowResend] = useState(false);

  const emailRedirectTo = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return `${window.location.origin}/auth/callback`;
  }, []);

  useEffect(() => {
    if (!authLoading && session) {
      router.replace("/dashboard");
    }
  }, [authLoading, session, router]);

  async function login() {
    setLoading(true);
    setMessage("");
    setShowResend(false);

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password.trim()) {
      setMessage("Enter your email and password.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      const lowerMessage = error.message.toLowerCase();

      if (
        lowerMessage.includes("email not confirmed") ||
        lowerMessage.includes("email_not_confirmed") ||
        lowerMessage.includes("confirm")
      ) {
        setMessage("Your email has not been confirmed yet.");
        setShowResend(true);
        setLoading(false);
        return;
      }

      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
  }

  async function resendConfirmationEmail() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Enter your email first so we know where to resend it.");
      return;
    }

    setResending(true);
    setMessage("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: trimmedEmail,
      options: {
        emailRedirectTo,
      },
    });

    if (error) {
      setMessage(error.message);
      setResending(false);
      return;
    }

    setMessage("Confirmation email sent. Check your inbox and spam folder.");
    setShowResend(true);
    setResending(false);
  }

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
              <span className="font-serif text-xl italic text-[#b4141e]">
                CS
              </span>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.5em] text-zinc-500">
              Members Only
            </p>
            <h1 className="mt-4 font-serif text-4xl font-light tracking-wide text-white">
              Crimson <span className="italic text-[#b4141e]">Society</span>
            </h1>

            <div className="mt-5 flex items-center justify-center gap-3">
              <span className="h-px w-10 bg-white/15" />
              <span className="text-[10px] tracking-[0.4em] text-[#b4141e]">
                ✦
              </span>
              <span className="h-px w-10 bg-white/15" />
            </div>

            <p className="mt-4 text-[11px] uppercase tracking-[0.35em] text-zinc-400">
              Welcome Back
            </p>
          </div>

          <form
            className="mt-10 flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              login();
            }}
          >
            <div>
              <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                Email
              </label>
              <input
                type="email"
                placeholder="member@crimsonsociety.cc"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-sm border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#b4141e]/60 focus:ring-1 focus:ring-[#b4141e]/40"
              />
            </div>

            {message && (
              <div className="rounded-sm border border-[#b4141e]/20 bg-[#b4141e]/10 px-4 py-3 text-sm text-zinc-200">
                {message}
              </div>
            )}

            {showResend && (
              <button
                type="button"
                onClick={resendConfirmationEmail}
                disabled={resending}
                className="text-left text-[11px] uppercase tracking-[0.25em] text-zinc-300 transition hover:text-[#e87a82] disabled:opacity-60"
              >
                {resending
                  ? "Sending confirmation email..."
                  : "Didn’t get it? Resend confirmation email."}
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative mt-4 inline-flex w-full items-center justify-center overflow-hidden rounded-sm bg-gradient-to-b from-[#b4141e] to-[#7a0d14] px-6 py-4 text-[11px] uppercase tracking-[0.45em] text-white shadow-[0_18px_40px_-12px_rgba(180,20,30,0.7)] transition hover:from-[#c8161f] hover:to-[#8a0e16] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="relative z-10 flex items-center gap-3">
                {loading ? "Entering..." : "Enter Society"}
                <span className="transition group-hover:translate-x-0.5">→</span>
              </span>
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />
              <span
                aria-hidden
                className="absolute inset-x-6 top-0 h-px bg-white/30"
              />
            </button>
          </form>

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

        <p className="mt-6 text-center text-[9px] uppercase tracking-[0.5em] text-zinc-600">
          Ride · Brotherhood · Legacy
        </p>
      </div>
    </main>
  );
}
