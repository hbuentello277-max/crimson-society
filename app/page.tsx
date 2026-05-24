"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type SplashState = "checking" | "guest" | "authenticated";

const AUTH_REDIRECT_DELAY = 1100;
const AUTHED_DESTINATION = "/dashboard"; // change to "/feed" or "/dashboard" if that is your real app home

export default function LandingPage() {
  const router = useRouter();
  const [state, setState] = useState<SplashState>("checking");
  const [splashFailed, setSplashFailed] = useState(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showButtons = state === "guest";
  const isAuthedSplash = state === "authenticated";

  const splashCopy = useMemo(
    () => ({
      eyebrow: "Crimson Society",
      title: "Built for the riders who move with intent.",
      body: "A private line of access for those who value discipline, presence, and the road itself.",
    }),
    []
  );

  useEffect(() => {
    let mounted = true;

    const clearRedirectTimer = () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };

    const scheduleRedirect = () => {
      clearRedirectTimer();
      redirectTimerRef.current = setTimeout(() => {
        router.replace(AUTHED_DESTINATION);
      }, AUTH_REDIRECT_DELAY);
    };

    const hydrateSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session) {
        setState("authenticated");
        scheduleRedirect();
      } else {
        setState("guest");
      }
    };

    void hydrateSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (session) {
        setState("authenticated");
        scheduleRedirect();
      } else {
        clearRedirectTimer();
        setState("guest");
      }
    });

    return () => {
      mounted = false;
      clearRedirectTimer();
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 44% at 50% -6%, rgba(180,20,30,0.22), transparent 64%)",
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#b4141e]/70 to-transparent" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10">
        <div className="w-full max-w-[30rem] text-center">
          <div className="mx-auto flex items-center justify-center gap-4">
            <span className="h-px w-10 bg-white/15" />
            <span className="text-[#b4141e]">✦</span>
            <span className="h-px w-10 bg-white/15" />
          </div>

          <div className="relative mx-auto mt-8 flex h-[280px] w-[280px] items-center justify-center overflow-hidden rounded-[34px] border border-[#b4141e]/25 bg-gradient-to-b from-[#151113] via-[#090909] to-black shadow-[0_30px_90px_-45px_rgba(0,0,0,0.95)] sm:h-[340px] sm:w-[340px]">
            {!splashFailed && (
              <Image
                src="/splash.png"
                alt=""
                fill
                priority
                sizes="(max-width: 640px) 280px, 340px"
                className="object-cover"
                onError={() => setSplashFailed(true)}
              />
            )}
            {splashFailed && (
              <div className="relative z-10 flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_center,rgba(180,20,30,0.22),transparent_54%)] px-8 text-center">
                <span className="text-3xl text-[#b4141e]">✦</span>
                <p className="mt-4 font-serif text-3xl text-white">
                  Crimson Society
                </p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
          </div>

          <div
            className={`transition-all duration-500 ${
              isAuthedSplash
                ? "mt-0 opacity-0 pointer-events-none translate-y-2"
                : "mt-8 opacity-100 translate-y-0"
            }`}
          >
            <p className="text-[11px] uppercase tracking-[0.38em] text-[#e87a82]">
              {splashCopy.eyebrow}
            </p>

            <h1 className="mt-4 font-serif text-[2.4rem] leading-[0.96] text-white sm:text-[3.1rem]">
              {splashCopy.title}
            </h1>

            <p className="mx-auto mt-4 max-w-[28rem] text-[13px] leading-6 text-zinc-400/85 sm:text-sm">
              {splashCopy.body}
            </p>

            {showButtons && (
              <div className="mt-7 flex items-center justify-center">
                <Link
                  href="/login"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#b4141e]/35 bg-[#b4141e]/12 px-6 py-3 text-[11px] uppercase tracking-[0.28em] text-[#f3d1d5] transition hover:border-[#b4141e]/65 hover:bg-[#b4141e]/18"
                >
                  Join Society
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
