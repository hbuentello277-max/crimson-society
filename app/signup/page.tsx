"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

export default function SignUpPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const redirectTo = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/auth/callback`;
  }, []);

  useEffect(() => {
    if (!authLoading && session) {
      router.replace("/dashboard");
    }
  }, [authLoading, session, router]);

  async function handleSignUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setInfoMsg("");

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setErrorMsg("Enter your email address.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    setEmail(trimmedEmail);
    setAwaitingConfirmation(true);
    setInfoMsg(`We sent a confirmation email to ${trimmedEmail}.`);
    setLoading(false);
  }

  async function handleResend() {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setErrorMsg("Enter your email first.");
      return;
    }

    setResending(true);
    setErrorMsg("");
    setInfoMsg("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: trimmedEmail,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setResending(false);
      return;
    }

    setInfoMsg(`Confirmation email sent again to ${trimmedEmail}.`);
    setResending(false);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% -10%, rgba(180,20,30,0.24), transparent 65%)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-xl items-center px-6 py-16">
        <div className="w-full rounded-[28px] border border-white/10 bg-[#0b0b0c]/95 p-8 shadow-[0_0_60px_-20px_rgba(180,20,30,0.35)] backdrop-blur">
          <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">
            Crimson Society
          </p>

          {!awaitingConfirmation ? (
            <>
              <h1 className="mt-4 font-serif text-5xl leading-none text-white">
                Request Access
              </h1>

              <p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">
                Enter your details, confirm your email, and step into the Society.
              </p>

              <form onSubmit={handleSignUp} className="mt-8 space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60"
                  required
                />

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60"
                  required
                />

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60"
                  required
                />

                {errorMsg && (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                    <p className="text-sm text-red-300">{errorMsg}</p>
                  </div>
                )}

                {infoMsg && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <p className="text-sm text-emerald-300">{infoMsg}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[#b4141e]/90 px-5 py-3 text-xs uppercase tracking-[0.28em] text-white transition hover:bg-[#b4141e] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Creating..." : "Join the Society"}
                </button>
              </form>

              <div className="mt-6">
                <Link
                  href="/login"
                  className="text-xs uppercase tracking-[0.25em] text-zinc-500 transition hover:text-zinc-300"
                >
                  Back to Login
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#b4141e]/30 bg-[#b4141e]/10 text-[#e87a82]">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 6h16v12H4z" />
                  <path d="m22 7-10 7L2 7" />
                </svg>
              </div>

              <h1 className="mt-6 font-serif text-5xl leading-none text-white">
                Check Your Email
              </h1>

              <p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">
                We sent a confirmation link to{" "}
                <span className="text-white">{email}</span>. Open the email and
                click the link to activate your access.
              </p>

              <p className="mt-4 max-w-md text-sm leading-7 text-zinc-500">
                After confirmation, you should be returned through the auth callback
                flow so your app can complete authentication more smoothly.
              </p>

              {errorMsg && (
                <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-sm text-red-300">{errorMsg}</p>
                </div>
              )}

              {infoMsg && (
                <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-sm text-emerald-300">{infoMsg}</p>
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resending
                    ? "Sending..."
                    : "Didn’t get it? Resend confirmation email."}
                </button>

                <Link
                  href="/login"
                  className="rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-white/30"
                >
                  Go to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}