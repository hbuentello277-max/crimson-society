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
      className={`fixed inset-0 h-[100dvh] w-[100vw] overflow-hidden bg-[#050505] text-white transition-opacity duration-500 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
    >
      <section className="fixed inset-0 h-[100dvh] w-[100vw] overflow-hidden">
        <div className="absolute inset-0 h-full w-full">
          {!splashFailed && (
            <Image
              src="/splash.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-contain object-center scale-[1.03]"
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

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/70" />
        </div>

        {showGuestButtons && (
          <div className="absolute inset-x-0 bottom-10 z-10 flex justify-center px-5 pb-[calc(env(safe-area-inset-bottom)+24px)]">
            <Link
              href="/login"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#b4141e]/60 bg-[#b4141e]/75 px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-white shadow-[0_18px_40px_-22px_rgba(180,20,30,0.9)] transition hover:bg-[#b4141e]"
            >
              Join Society
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
