"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { AuthBackToLoginLink, AuthMessage, AuthPageShell } from "@/components/auth/AuthPageShell";
import { buildPasswordResetRedirectUrl } from "@/lib/auth/password-reset";
import { supabase } from "@/lib/supabase";

function ForgotPasswordPageContent() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const redirectTo = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return buildPasswordResetRedirectUrl(window.location.origin);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Enter the email address on your account.");
      setLoading(false);
      return;
    }

    if (!redirectTo) {
      setError("Could not determine a return URL. Refresh and try again.");
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setMessage(
      "If an account exists for that email, we sent a password reset link. Check your inbox and spam folder.",
    );
    setLoading(false);
  }

  return (
    <AuthPageShell
      title="Crimson"
      titleAccent="Society"
      subtitle="Reset Password"
    >
      <form className="mt-10 flex flex-col gap-5" onSubmit={handleSubmit}>
        <p className="text-sm leading-6 text-zinc-400">
          Enter your email and we&apos;ll send a secure link to choose a new password.
        </p>

        <div>
          <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-zinc-500">
            Email
          </label>
          <input
            type="email"
            autoComplete="email"
            placeholder="member@crimsonsociety.cc"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={sent}
            className="w-full rounded-sm border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#b4141e]/60 focus:ring-1 focus:ring-[#b4141e]/40 disabled:opacity-60"
          />
        </div>

        {error ? <AuthMessage>{error}</AuthMessage> : null}
        {message ? <AuthMessage tone="success">{message}</AuthMessage> : null}

        <button
          type="submit"
          disabled={loading || sent}
          className="group relative mt-2 inline-flex w-full items-center justify-center overflow-hidden rounded-sm bg-gradient-to-b from-[#b4141e] to-[#7a0d14] px-6 py-4 text-[11px] uppercase tracking-[0.45em] text-white shadow-[0_18px_40px_-12px_rgba(180,20,30,0.7)] transition hover:from-[#c8161f] hover:to-[#8a0e16] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="relative z-10 flex items-center gap-3">
            {loading ? "Sending..." : sent ? "Email Sent" : "Send Reset Link"}
            {!loading && !sent ? <span className="transition group-hover:translate-x-0.5">→</span> : null}
          </span>
        </button>
      </form>

      <AuthBackToLoginLink />
    </AuthPageShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordPageContent />
    </Suspense>
  );
}
