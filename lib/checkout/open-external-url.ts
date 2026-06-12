"use client";

import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export async function openExternalUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error("Missing external URL.");
  }

  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: trimmed });
    return;
  }

  window.location.href = trimmed;
}
