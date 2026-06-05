"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { enableDevicePush, getPushPermissionState, isPushSupported } from "@/lib/push/client";
import { isPushConfiguredOnClient } from "@/lib/push/firebase-public";
import {
  clearPushPromptPending,
  dismissPushPrompt,
  isIosBrowser,
  isStandalonePwa,
  shouldShowPushPrompt,
} from "@/lib/push/prompt-state";

type PromptMode = "enable" | "install" | "hidden";

function resolvePromptMode(): PromptMode {
  if (!shouldShowPushPrompt()) return "hidden";
  if (!isPushConfiguredOnClient()) return "hidden";

  if (!isPushSupported()) {
    if (isIosBrowser() && !isStandalonePwa()) {
      return "install";
    }
    return "hidden";
  }

  return "enable";
}

export function PushPermissionPrompt() {
  const [mode, setMode] = useState<PromptMode>("hidden");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setMode(resolvePromptMode());
  }, []);

  if (mode === "hidden" || typeof document === "undefined") {
    return null;
  }

  async function handleEnable() {
    setLoading(true);
    setMessage(null);

    try {
      await enableDevicePush();
      clearPushPromptPending();
      setMode("hidden");
    } catch (error) {
      const permission = getPushPermissionState();
      if (permission === "denied") {
        dismissPushPrompt();
        setMessage(
          "Notifications are blocked for this browser. Enable them in system settings if you change your mind.",
        );
        setMode("hidden");
        return;
      }

      setMessage(
        error instanceof Error ? error.message : "Could not enable notifications.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    dismissPushPrompt();
    setMode("hidden");
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[320] flex flex-col justify-end bg-black/75 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-prompt-title"
        className="w-full max-w-md rounded-t-3xl border border-[#b4141e]/35 bg-gradient-to-b from-[#120608] via-[#0a0a0b] to-[#090909] p-6 shadow-[0_0_80px_rgba(120,0,0,0.25)] sm:rounded-3xl"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}
      >
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Stay in the loop</p>
        <h2 id="push-prompt-title" className="mt-2 font-serif text-2xl italic text-white">
          {mode === "install" ? "Install to enable alerts" : "Enable ride alerts, messages, and order updates?"}
        </h2>

        {mode === "install" ? (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            On iPhone, add Crimson Society to your Home Screen, then open the app from there to
            enable push notifications.
          </p>
        ) : (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Get notified when rides start, messages arrive, or your merch order is ready — even when
            the app is in the background.
          </p>
        )}

        {message ? <p className="mt-3 text-sm text-amber-200/90">{message}</p> : null}

        <div className="mt-6 flex flex-col gap-2">
          {mode === "enable" ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleEnable()}
              className="rounded-full border border-[#b4141e]/70 bg-[#b4141e]/30 px-5 py-3 text-xs uppercase tracking-[0.2em] text-[#f4dadd] transition hover:bg-[#b4141e]/45 disabled:opacity-50"
            >
              {loading ? "Enabling…" : "Enable notifications"}
            </button>
          ) : null}

          <button
            type="button"
            disabled={loading}
            onClick={handleDismiss}
            className="rounded-full border border-white/15 px-5 py-3 text-xs uppercase tracking-[0.2em] text-zinc-400 transition hover:border-white/25 hover:text-zinc-200"
          >
            {mode === "install" ? "Got it" : "Not now"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
