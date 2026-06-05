import { getPushPermissionState } from "@/lib/push/client";

const DISMISSED_KEY = "crimson_push_prompt_dismissed";
const PENDING_KEY = "crimson_push_prompt_pending";

export function markPushPromptPending() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_KEY, "1");
}

export function clearPushPromptPending() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_KEY);
}

export function dismissPushPrompt() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISMISSED_KEY, "1");
  clearPushPromptPending();
}

function isPushPromptDismissed() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(DISMISSED_KEY) === "1";
}

function isPushPromptPending() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PENDING_KEY) === "1";
}

export function shouldShowPushPrompt() {
  if (typeof window === "undefined") return false;
  if (isPushPromptDismissed()) return false;

  const permission = getPushPermissionState();
  if (permission === "granted" || permission === "denied" || permission === "unsupported") {
    return false;
  }

  const urlPending = new URLSearchParams(window.location.search).has("push_prompt");
  return isPushPromptPending() || urlPending;
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
