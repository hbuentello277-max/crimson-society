import { getPushPermissionState } from "@/lib/push/client";

const DISMISSED_AT_KEY = "crimson_push_prompt_dismissed_at";
const DISMISSED_INSTALL_KEY = "crimson_push_prompt_dismissed_install";
const DISMISSED_SESSION_KEY = "crimson_push_prompt_dismissed_session";
const PENDING_KEY = "crimson_push_prompt_pending";
const INSTALL_ID_KEY = "crimson_push_install_id";

const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function readStorage(storage: Storage, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function removeStorage(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export function getOrCreateInstallId() {
  if (typeof window === "undefined") return "server";

  const existing = readStorage(window.sessionStorage, INSTALL_ID_KEY);
  if (existing) return existing;

  const installId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `install-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  writeStorage(window.sessionStorage, INSTALL_ID_KEY, installId);
  return installId;
}

function clearDismissState() {
  if (typeof window === "undefined") return;
  removeStorage(window.localStorage, DISMISSED_AT_KEY);
  removeStorage(window.localStorage, DISMISSED_INSTALL_KEY);
  removeStorage(window.sessionStorage, DISMISSED_SESSION_KEY);
}

export function markPushPromptPending() {
  if (typeof window === "undefined") return;
  writeStorage(window.localStorage, PENDING_KEY, "1");
}

export function clearPushPromptPending() {
  if (typeof window === "undefined") return;
  removeStorage(window.localStorage, PENDING_KEY);
}

export function dismissPushPrompt() {
  if (typeof window === "undefined") return;

  const installId = getOrCreateInstallId();
  writeStorage(window.sessionStorage, DISMISSED_SESSION_KEY, "1");
  writeStorage(window.localStorage, DISMISSED_AT_KEY, new Date().toISOString());
  writeStorage(window.localStorage, DISMISSED_INSTALL_KEY, installId);
  clearPushPromptPending();
}

function isPushPromptPending() {
  if (typeof window === "undefined") return false;
  return readStorage(window.localStorage, PENDING_KEY) === "1";
}

export function isPushPromptDismissed() {
  if (typeof window === "undefined") return true;

  if (readStorage(window.sessionStorage, DISMISSED_SESSION_KEY) === "1") {
    return true;
  }

  const dismissedAt = readStorage(window.localStorage, DISMISSED_AT_KEY);
  const dismissedInstall = readStorage(window.localStorage, DISMISSED_INSTALL_KEY);
  const currentInstall = getOrCreateInstallId();

  if (!dismissedAt || dismissedInstall !== currentInstall) {
    return false;
  }

  const dismissedTime = Date.parse(dismissedAt);
  if (!Number.isFinite(dismissedTime) || Date.now() - dismissedTime > DISMISS_TTL_MS) {
    clearDismissState();
    return false;
  }

  return true;
}

export function hasPushPromptTrigger() {
  if (typeof window === "undefined") return false;
  const urlPending = new URLSearchParams(window.location.search).has("push_prompt");
  return isPushPromptPending() || urlPending;
}

/** @deprecated Use evaluatePushPromptState() for subscription-aware gating. */
export function shouldShowPushPrompt() {
  if (typeof window === "undefined") return false;
  if (isPushPromptDismissed()) return false;

  const permission = getPushPermissionState();
  if (permission === "granted" || permission === "denied" || permission === "unsupported") {
    return false;
  }

  return hasPushPromptTrigger();
}

export function isIosBrowser() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
