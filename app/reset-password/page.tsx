"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthBackToLoginLink, AuthMessage, AuthPageShell } from "@/components/auth/AuthPageShell";
import { useAuth } from "@/components/AuthProvider";
import { redirectAfterAuth } from "@/lib/auth/redirect-after-auth";
import {
  getPasswordRequirementChecks,
  getPasswordValidationErrorKey,
  isPasswordValid,
} from "@/lib/password";
import { supabase } from "@/lib/supabase";

const requirementLabels = {
  minLength: "At least 8 characters",
  uppercase: "At least one uppercase letter (A–Z)",
  lowercase: "At least one lowercase letter (a–z)",
  number: "At least one number (0–9)",
} as const;

function ResetPasswordPageContent() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const passwordChecks = getPasswordRequirementChecks(password);
  const passwordMeetsPolicy = isPasswordValid(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = passwordMeetsPolicy && passwordsMatch && Boolean(session?.user?.id);

  useEffect(() => {
    if (!authLoading && !session?.user?.id) {
      setError("This reset link is invalid or has expired. Request a new one from the forgot password page.");
    }
  }, [authLoading, session?.user?.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!session?.user?.id) {
      setError("Sign in from your reset email link before choosing a new password.");
      return;
    }

    if (!passwordMeetsPolicy) {
      const failedKey = getPasswordValidationErrorKey(password);
      setError(failedKey ? requirementLabels[failedKey] : "Password does not meet all requirements.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setMessage("Your password was updated. Taking you back into Crimson Society…");

    await redirectAfterAuth(router, session.user.id);
    setLoading(false);
  }

  return (
    <AuthPageShell
      title="Crimson"
      titleAccent="Society"
      subtitle="Choose New Password"
    >
      <form className="mt-10 flex flex-col gap-5" onSubmit={handleSubmit}>
        <p className="text-sm leading-6 text-zinc-400">
          Set a new password for your account. You&apos;ll stay signed in after saving.
        </p>

        <div>
          <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-zinc-500">
            New Password
          </label>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="••••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={authLoading || !session?.user?.id || loading}
            className="w-full rounded-sm border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#b4141e]/60 focus:ring-1 focus:ring-[#b4141e]/40 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-zinc-500">
            Confirm Password
          </label>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="••••••••••"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={authLoading || !session?.user?.id || loading}
            className="w-full rounded-sm border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#b4141e]/60 focus:ring-1 focus:ring-[#b4141e]/40 disabled:opacity-60"
          />
        </div>

        {password.length > 0 ? (
          <ul className="space-y-1 text-xs text-zinc-500">
            {(Object.keys(requirementLabels) as Array<keyof typeof requirementLabels>).map((key) => (
              <li key={key} className={passwordChecks[key] ? "text-emerald-400/90" : undefined}>
                {passwordChecks[key] ? "✓ " : "○ "}
                {requirementLabels[key]}
              </li>
            ))}
          </ul>
        ) : null}

        {error ? (
          <AuthMessage>
            {error}
            {!session?.user?.id && !authLoading ? (
              <>
                {" "}
                <Link href="/forgot" className="underline underline-offset-2 hover:text-white">
                  Request a new reset link
                </Link>
                .
              </>
            ) : null}
          </AuthMessage>
        ) : null}
        {message ? <AuthMessage tone="success">{message}</AuthMessage> : null}

        <button
          type="submit"
          disabled={authLoading || loading || !canSubmit}
          className="group relative mt-2 inline-flex w-full items-center justify-center overflow-hidden rounded-sm bg-gradient-to-b from-[#b4141e] to-[#7a0d14] px-6 py-4 text-[11px] uppercase tracking-[0.45em] text-white shadow-[0_18px_40px_-12px_rgba(180,20,30,0.7)] transition hover:from-[#c8161f] hover:to-[#8a0e16] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="relative z-10 flex items-center gap-3">
            {loading ? "Saving..." : "Update Password"}
            {!loading ? <span className="transition group-hover:translate-x-0.5">→</span> : null}
          </span>
        </button>
      </form>

      <AuthBackToLoginLink />
    </AuthPageShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
