"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const AUTH_REDIRECT_DELAY = 1750;
const SPLASH_FADE_MS = 420;
const AUTHED_DESTINATION = "/dashboard"; // change to "/feed" or "/dashboard" if that is your real app home

export default function LandingPage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [splashFailed, setSplashFailed] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showGuestButtons = !loading && !session;

  useEffect(() => {
    let mounted = true;

    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    if (!session) {
      return () => {
        mounted = false;
      };
    }

    redirectTimerRef.current = setTimeout(() => {
      if (!mounted) return;

      setIsFading(true);
      fadeTimerRef.current = setTimeout(() => {
        if (mounted) router.replace(AUTHED_DESTINATION);
      }, SPLASH_FADE_MS);
    }, AUTH_REDIRECT_DELAY);

    return () => {
      mounted = false;
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [router, session]);

  return (
    <main
      className={`relative min-h-[100dvh] bg-[#050505] text-white transition-opacity duration-500 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 44% at 50% -6%, rgba(180,20,30,0.22), transparent 64%)",
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#b4141e]/70 to-transparent" />

      <section className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center pb-[calc(env(safe-area-inset-bottom)+28px)]">
        <div className="relative mx-auto flex min-h-0 w-full flex-1 items-center justify-center bg-gradient-to-b from-[#151113] via-[#090909] to-black sm:max-w-[30rem] sm:border-x sm:border-[#b4141e]/20">
          {!splashFailed && (
            <Image
              src="/splash.png"
              alt=""
              fill
              priority
              sizes="(max-width: 640px) 100vw, 480px"
              className="object-contain object-center"
              onError={() => setSplashFailed(true)}
            />
          )}
          {splashFailed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,rgba(180,20,30,0.22),transparent_54%)] px-8 text-center">
              <span className="text-4xl text-[#b4141e]">✦</span>
              <p className="mt-4 font-serif text-4xl text-white">
                Crimson Society
              </p>
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/78" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_bottom,rgba(180,20,30,0.24),transparent_68%)]" />
        </div>

        {showGuestButtons && (
          <div className="relative z-10 mt-3 grid w-full grid-cols-2 gap-3 px-5 sm:max-w-[30rem]">
            <Link
              href="/login"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#b4141e]/60 bg-[#b4141e]/75 px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-white shadow-[0_18px_40px_-22px_rgba(180,20,30,0.9)] transition hover:bg-[#b4141e]"
            >
              Join Society
            </Link>
            <Link
              href="/shop"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/18 bg-black/35 px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-zinc-100 backdrop-blur-md transition hover:border-[#b4141e]/60 hover:bg-[#b4141e]/12"
            >
              Explore Drops
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
