"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Language = "en" | "es";
type LoadingState = "signup" | "resend" | null;

const copy = {
  en: {
    eyebrow: "RIDE • CULTURE • LEGACY",
    title: "Request Access",
    subtitle:
      "Create your Crimson Society account and step into a private circle built for riders, status, and legacy.",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    createAccount: "Create Account",
    creating: "Creating...",
    alreadyMember: "Already a member?",
    goToLogin: "Go to Login",
    checkEmailTitle: "Check Your Email",
    checkEmailBody:
      "We sent you a confirmation link. Open your inbox, verify your email, then return to log in.",
    didntGetIt: "Didn’t get it?",
    resend: "Resend Email",
    resending: "Resending...",
    backToSignup: "Back to Signup",
    fillAllFields: "Please fill in all fields.",
    passwordsNoMatch: "Passwords do not match.",
    passwordTooShort: "Password must be at least 6 characters.",
    accountCreated: "Account created. Check your email to confirm your account.",
    enterEmailToResend: "Enter your email to resend confirmation.",
    confirmationResent: "Confirmation email resent.",
    genericError: "Something went wrong.",
    ageConfirm: "I confirm I am 18 years or older.",
    termsAgree: "I agree to the",
    termsLink: "Terms of Service",
    guidelinesAgree: "I agree to the",
    guidelinesLink: "Community Guidelines",
    complianceRequired:
      "Please confirm you are 18 or older and agree to the Terms and Community Guidelines before creating your account.",
  },
  es: {
    eyebrow: "RIDE • CULTURE • LEGACY",
    title: "Solicitar acceso",
    subtitle:
      "Crea tu cuenta de Crimson Society y entra a un círculo privado creado para motociclistas, estatus y legado.",
    email: "Correo electrónico",
    password: "Contraseña",
    confirmPassword: "Confirmar contraseña",
    createAccount: "Crear cuenta",
    creating: "Creando...",
    alreadyMember: "¿Ya eres miembro?",
    goToLogin: "Ir a Iniciar sesión",
    checkEmailTitle: "Revisa tu correo",
    checkEmailBody:
      "Te enviamos un enlace de confirmación. Abre tu bandeja de entrada, verifica tu correo y luego vuelve para iniciar sesión.",
    didntGetIt: "¿No te llegó?",
    resend: "Reenviar correo",
    resending: "Reenviando...",
    backToSignup: "Volver al registro",
    fillAllFields: "Completa todos los campos.",
    passwordsNoMatch: "Las contraseñas no coinciden.",
    passwordTooShort: "La contraseña debe tener al menos 6 caracteres.",
    accountCreated: "Cuenta creada. Revisa tu correo para confirmar tu cuenta.",
    enterEmailToResend: "Ingresa tu correo para reenviar la confirmación.",
    confirmationResent: "Correo de confirmación reenviado.",
    genericError: "Algo salió mal.",
    ageConfirm: "Confirmo que tengo 18 años o más.",
    termsAgree: "Acepto los",
    termsLink: "Términos de servicio",
    guidelinesAgree: "Acepto las",
    guidelinesLink: "Normas de la comunidad",
    complianceRequired:
      "Confirma que tienes 18 años o más y acepta los Términos y las Normas de la comunidad antes de crear tu cuenta.",
  },
} as const;

export default function SignUpPage() {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";

    const saved = window.localStorage.getItem("signup-language");
    return saved === "en" || saved === "es" ? saved : "en";
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<LoadingState>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);

  const complianceComplete = ageConfirmed && termsAccepted && guidelinesAccepted;

  const changeLanguage = (next: Language) => {
    setLanguage(next);

    if (typeof window !== "undefined") {
      window.localStorage.setItem("signup-language", next);
    }
  };

  const t = copy[language];

  const emailRedirectTo = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return `${window.location.origin}/auth/callback`;
  }, []);

  async function handleSignUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    const trimmedEmail = email.trim();

    if (!complianceComplete) {
      setError(t.complianceRequired);
      return;
    }

    if (!trimmedEmail || !password || !confirmPassword) {
      setError(t.fillAllFields);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.passwordsNoMatch);
      return;
    }

    if (password.length < 6) {
      setError(t.passwordTooShort);
      return;
    }

    try {
      setLoading("signup");

      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setAwaitingConfirmation(true);
      setMessage(t.accountCreated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setLoading(null);
    }
  }

  async function handleResendEmail() {
    setError("");
    setMessage("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError(t.enterEmailToResend);
      return;
    }

    try {
      setLoading("resend");

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: trimmedEmail,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setMessage(t.confirmationResent);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.22),transparent_38%),linear-gradient(to_bottom,#050505,#0a0a0a,#000000)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px] opacity-20" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          {!awaitingConfirmation ? (
            <>
              <p className="mb-4 text-center text-[11px] uppercase tracking-[0.38em] text-zinc-400">
                {t.eyebrow}
              </p>

              <h1 className="text-center text-4xl font-semibold tracking-[0.04em] text-white">
                {t.title}
              </h1>

              <p className="mx-auto mt-4 max-w-sm text-center text-sm leading-6 text-zinc-300">
                {t.subtitle}
              </p>

              <form onSubmit={handleSignUp} className="mt-8 space-y-4">
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.24em] text-zinc-400">
                    {t.email}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-red-700/70 focus:bg-white/10"
                    placeholder={t.email}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.24em] text-zinc-400">
                    {t.password}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-red-700/70 focus:bg-white/10"
                    placeholder={t.password}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.24em] text-zinc-400">
                    {t.confirmPassword}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-red-700/70 focus:bg-white/10"
                    placeholder={t.confirmPassword}
                  />
                </div>

                <div className="space-y-2.5 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-zinc-300">
                    <input
                      type="checkbox"
                      checked={ageConfirmed}
                      onChange={(e) => {
                        setAgeConfirmed(e.target.checked);
                        if (error === t.complianceRequired) setError("");
                      }}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 accent-[#b4141e]"
                    />
                    <span>{t.ageConfirm}</span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-zinc-300">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => {
                        setTermsAccepted(e.target.checked);
                        if (error === t.complianceRequired) setError("");
                      }}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 accent-[#b4141e]"
                    />
                    <span>
                      {t.termsAgree}{" "}
                      <Link
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#e87a82] underline decoration-[#b4141e]/40 underline-offset-2 hover:text-[#f1c3c7]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t.termsLink}
                      </Link>
                      .
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-zinc-300">
                    <input
                      type="checkbox"
                      checked={guidelinesAccepted}
                      onChange={(e) => {
                        setGuidelinesAccepted(e.target.checked);
                        if (error === t.complianceRequired) setError("");
                      }}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 accent-[#b4141e]"
                    />
                    <span>
                      {t.guidelinesAgree}{" "}
                      <Link
                        href="/community-guidelines"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#e87a82] underline decoration-[#b4141e]/40 underline-offset-2 hover:text-[#f1c3c7]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t.guidelinesLink}
                      </Link>
                      .
                    </span>
                  </label>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-700/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}

                {message ? (
                  <div className="rounded-2xl border border-emerald-700/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
                    {message}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading === "signup" || !complianceComplete}
                  className="h-12 w-full rounded-2xl border border-red-700/60 bg-red-700 text-sm font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading === "signup" ? t.creating : t.createAccount}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-zinc-400">{t.alreadyMember}</p>
                <Link
                  href="/login"
                  className="mt-3 inline-flex h-11 items-center justify-center rounded-full border border-white/15 px-5 text-xs uppercase tracking-[0.24em] text-zinc-200 transition hover:border-white/30 hover:bg-white/5"
                >
                  {t.goToLogin}
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="mb-4 text-center text-[11px] uppercase tracking-[0.38em] text-zinc-400">
                {t.eyebrow}
              </p>

              <h1 className="text-center text-4xl font-semibold tracking-[0.04em] text-white">
                {t.checkEmailTitle}
              </h1>

              <p className="mx-auto mt-4 max-w-sm text-center text-sm leading-6 text-zinc-300">
                {t.checkEmailBody}
              </p>

              {error ? (
                <div className="mt-6 rounded-2xl border border-red-700/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="mt-6 rounded-2xl border border-emerald-700/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
                  {message}
                </div>
              ) : null}

              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={loading === "resend"}
                  className="h-12 w-full rounded-2xl border border-red-700/60 bg-red-700 text-sm font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading === "resend" ? t.resending : t.resend}
                </button>

                <button
                  type="button"
                  onClick={() => setAwaitingConfirmation(false)}
                  className="h-12 w-full rounded-2xl border border-white/12 bg-white/5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  {t.backToSignup}
                </button>
              </div>

              <p className="mt-5 text-center text-sm text-zinc-400">
                {t.didntGetIt}
              </p>

              <div className="mt-4 text-center">
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 px-5 text-xs uppercase tracking-[0.24em] text-zinc-200 transition hover:border-white/30 hover:bg-white/5"
                >
                  {t.goToLogin}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        className="fixed right-4 z-50"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        }}
      >
        <div className="flex items-center gap-1 rounded-full border border-red-700/60 bg-black/45 p-1 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <button
            type="button"
            onClick={() => changeLanguage("en")}
            aria-pressed={language === "en"}
            className={`min-h-[36px] rounded-full px-3 text-xs font-medium transition ${
              language === "en"
                ? "bg-red-700 text-white"
                : "text-zinc-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            English
          </button>

          <span className="text-xs text-zinc-500">|</span>

          <button
            type="button"
            onClick={() => changeLanguage("es")}
            aria-pressed={language === "es"}
            className={`min-h-[36px] rounded-full px-3 text-xs font-medium transition ${
              language === "es"
                ? "bg-red-700 text-white"
                : "text-zinc-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            Español
          </button>
        </div>
      </div>
    </main>
  );
}