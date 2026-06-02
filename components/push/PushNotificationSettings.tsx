"use client";

import { useCallback, useEffect, useState } from "react";
import {
  disablePushOnServer,
  enableDevicePush,
  getPushPermissionState,
  isPushSupported,
} from "@/lib/push/client";
import { isPushConfiguredOnClient } from "@/lib/push/firebase-public";
import {
  APP_BUILD_COMMIT,
  EXPECTED_MIN_COMMIT_PREFIX,
  EXPECTED_PUSH_REGISTER_API_VERSION,
  PUSH_CLIENT_BUILD,
} from "@/lib/push/client-build";

type Status = "idle" | "loading" | "enabled" | "disabled" | "unsupported" | "error";

type DeployProbe = {
  loading: boolean;
  httpStatus: number | null;
  apiVersion: number | null;
  apiCommit: string | null;
  headerCommit: string | null;
  probeError: string | null;
  stale: boolean;
};

export function PushNotificationSettings() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [permission, setPermission] = useState(getPushPermissionState());
  const [deployProbe, setDeployProbe] = useState<DeployProbe>({
    loading: true,
    httpStatus: null,
    apiVersion: null,
    apiCommit: null,
    headerCommit: null,
    probeError: null,
    stale: false,
  });

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

  useEffect(() => {
    let cancelled = false;

    async function probeDeploy() {
      try {
        const response = await fetch("/api/push/register", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });

        const headerCommit = response.headers.get("X-App-Commit");
        const headerVersion = response.headers.get("X-Push-Register-Version");

        if (response.status === 405) {
          if (!cancelled) {
            setDeployProbe({
              loading: false,
              httpStatus: 405,
              apiVersion: null,
              apiCommit: null,
              headerCommit,
              probeError:
                "Production API is older than push-v3 (GET not allowed). Redeploy main from Vercel.",
              stale: true,
            });
          }
          return;
        }

        const payload = (await response.json().catch(() => null)) as {
          version?: number;
          commit?: string;
        } | null;

        const apiVersion =
          typeof payload?.version === "number"
            ? payload.version
            : headerVersion
              ? Number(headerVersion)
              : null;
        const apiCommit = payload?.commit || headerCommit || null;
        const commitShort = apiCommit?.slice(0, 7) ?? null;

        const stale =
          response.status !== 200 ||
          apiVersion !== EXPECTED_PUSH_REGISTER_API_VERSION;

        if (!cancelled) {
          setDeployProbe({
            loading: false,
            httpStatus: response.status,
            apiVersion,
            apiCommit: commitShort,
            headerCommit: headerCommit?.slice(0, 7) ?? null,
            probeError: stale
              ? `Expected API v${EXPECTED_PUSH_REGISTER_API_VERSION} at commit ${EXPECTED_MIN_COMMIT_PREFIX}+.`
              : null,
            stale,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setDeployProbe({
            loading: false,
            httpStatus: null,
            apiVersion: null,
            apiCommit: null,
            headerCommit: null,
            probeError:
              error instanceof Error ? error.message : "Could not reach /api/push/register.",
            stale: true,
          });
        }
      }
    }

    void probeDeploy();

    return () => {
      cancelled = true;
    };
  }, []);

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

      <div
        className={`mt-4 rounded-lg border px-4 py-3 text-xs leading-5 ${
          deployProbe.stale
            ? "border-amber-500/40 bg-amber-500/10 text-amber-100/90"
            : "border-white/10 bg-black/25 text-zinc-500"
        }`}
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Build debug</p>
        <p className="mt-2 font-mono text-[11px] text-zinc-300">
          App bundle: {PUSH_CLIENT_BUILD} · {APP_BUILD_COMMIT}
        </p>
        {deployProbe.loading ? (
          <p className="mt-1 font-mono text-[11px]">API probe: checking /api/push/register…</p>
        ) : (
          <>
            <p className="mt-1 font-mono text-[11px] text-zinc-300">
              API probe: HTTP {deployProbe.httpStatus ?? "—"}
              {deployProbe.apiVersion !== null ? ` · v${deployProbe.apiVersion}` : ""}
              {deployProbe.apiCommit ? ` · ${deployProbe.apiCommit}` : ""}
              {deployProbe.headerCommit && deployProbe.headerCommit !== deployProbe.apiCommit
                ? ` (header ${deployProbe.headerCommit})`
                : ""}
            </p>
            {deployProbe.probeError && (
              <p className="mt-2 text-[11px] leading-5 text-amber-100/90">{deployProbe.probeError}</p>
            )}
            {!deployProbe.stale && !deployProbe.probeError && (
              <p className="mt-2 text-[11px] text-emerald-300/90">
                Server matches expected push register API ({EXPECTED_MIN_COMMIT_PREFIX}+).
              </p>
            )}
          </>
        )}
        <p className="mt-2 text-[10px] leading-4 text-zinc-600">
          If App bundle shows push-v4 but API probe is HTTP 405, production Vercel is not deployed from
          latest main. Remove and re-add the Home Screen app after redeploy.
        </p>
      </div>

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
