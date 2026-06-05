"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/AuthProvider";
import {
  evaluatePushPromptState,
  type PushPromptMode,
} from "@/lib/push/evaluate-prompt";
import { enableDevicePush, getPushPermissionState } from "@/lib/push/client";
import {
  clearPushPromptPending,
  dismissPushPrompt,
} from "@/lib/push/prompt-state";

type PushPermissionPromptProps = {
  /** Show manual settings guidance when permission is denied (inbox). */
  allowDeniedGuidance?: boolean;
};

export function PushPermissionPrompt({
  allowDeniedGuidance = false,
}: PushPermissionPromptProps) {
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<PushPromptMode>("hidden");
  const [loadingAction, setLoadingAction] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !session?.user?.id) {
      setMode("hidden");
      return;
    }

    let cancelled = false;

    async function resolveMode() {
      const evaluation = await evaluatePushPromptState({ allowDeniedGuidance });
      if (!cancelled) {
        setMode(evaluation.mode);
      }
    }

    void resolveMode();

    return () => {
      cancelled = true;
    };
  }, [loading, session?.user?.id, allowDeniedGuidance]);

  if (mode === "hidden" || typeof document === "undefined") {
    return null;
  }

  async function handleEnable() {
    setLoadingAction(true);
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
      setLoadingAction(false);
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
          {mode === "install"
            ? "Install to enable alerts"
            : mode === "denied"
              ? "Notifications are turned off"
              : "Enable ride alerts, messages, and order updates?"}
        </h2>

        {mode === "install" ? (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            On iPhone, add Crimson Society to your Home Screen, then open the app from there to
            enable push notifications.
          </p>
        ) : mode === "denied" ? (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Crimson cannot request notification permission while it is blocked. Open iOS Settings →
            Notifications → Crimson Society and allow alerts, or use Notification settings in your
            profile.
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
              disabled={loadingAction}
              onClick={() => void handleEnable()}
              className="rounded-full border border-[#b4141e]/70 bg-[#b4141e]/30 px-5 py-3 text-xs uppercase tracking-[0.2em] text-[#f4dadd] transition hover:bg-[#b4141e]/45 disabled:opacity-50"
            >
              {loadingAction ? "Enabling…" : "Enable notifications"}
            </button>
          ) : null}

          <button
            type="button"
            disabled={loadingAction}
            onClick={handleDismiss}
            className="rounded-full border border-white/15 px-5 py-3 text-xs uppercase tracking-[0.2em] text-zinc-400 transition hover:border-white/25 hover:text-zinc-200"
          >
            {mode === "install" || mode === "denied" ? "Got it" : "Not now"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
