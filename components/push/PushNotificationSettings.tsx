"use client";

import { useCallback, useEffect, useState } from "react";
import {
  disablePushOnServer,
  enableDevicePush,
  getPushPermissionState,
  isPushSupported,
} from "@/lib/push/client";
import { isPushConfiguredOnClient } from "@/lib/push/firebase-public";

type Status = "idle" | "loading" | "enabled" | "disabled" | "unsupported" | "error";

export function PushNotificationSettings() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [permission, setPermission] = useState(getPushPermissionState());

  const refreshPermission = useCallback(() => {
    setPermission(getPushPermissionState());
  }, []);

  useEffect(() => {
    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }

    if (permission === "granted") {
      setStatus("enabled");
      return;
    }

    if (permission === "denied") {
      setStatus("disabled");
      return;
    }

    setStatus("idle");
  }, [permission]);

  async function handleEnable() {
    setStatus("loading");
    setMessage(null);

    try {
      await enableDevicePush();
      refreshPermission();
      setStatus("enabled");
      setMessage("Device notifications are enabled for this browser.");
    } catch (error) {
      refreshPermission();
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not enable notifications.");
    }
  }

  async function handleDisable() {
    setStatus("loading");
    setMessage(null);

    try {
      await disablePushOnServer();
      refreshPermission();
      setStatus("disabled");
      setMessage("Device notifications are disabled for your account on this browser.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not disable notifications.");
    }
  }

  const configured = isPushConfiguredOnClient();

  return (
    <section className="mt-6 rounded-lg border border-white/10 bg-white/[0.025] p-5">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#d85f6c]">Device alerts</p>
      <h2 className="mt-2 font-serif text-2xl leading-none text-[#f4f0ea]">Push notifications</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        Get alerts for messages, follows, and meet activity even when Crimson Society is in the
        background. In-app notifications remain your activity ledger.
      </p>

      {!configured && (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100/90">
          Push is not configured in this environment yet. Add Firebase web credentials to enable
          device alerts.
        </p>
      )}

      {status === "unsupported" && (
        <p className="mt-4 text-sm leading-6 text-zinc-500">
          This browser does not support web push. On iPhone, install Crimson Society to your Home
          Screen and open it from there (see steps below).
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleEnable()}
          disabled={!configured || status === "loading" || status === "unsupported"}
          className="rounded-lg border border-[#7f111b]/70 bg-[#7f111b]/25 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#f4dadd] transition hover:bg-[#7f111b]/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Enable notifications
        </button>

        <button
          type="button"
          onClick={() => void handleDisable()}
          disabled={status === "loading" || status === "unsupported"}
          className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Disable push
        </button>
      </div>

      {message && <p className="mt-4 text-sm leading-6 text-zinc-400">{message}</p>}

      <div className="mt-6 rounded-lg border border-white/10 bg-black/25 p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">iPhone (PWA)</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-zinc-400">
          <li>Open Crimson Society in Safari.</li>
          <li>Tap Share, then Add to Home Screen.</li>
          <li>Launch the app from your Home Screen (not Safari tabs).</li>
          <li>Return here and tap Enable notifications.</li>
        </ol>
        <p className="mt-3 text-xs leading-5 text-zinc-600">
          iOS only supports push for installed PWAs on iOS 16.4+. Permission must be granted from the
          installed app.
        </p>
      </div>
    </section>
  );
}
