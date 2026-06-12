"use client";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { resolveNativeDeepLinkAction } from "@/lib/navigation/native-deep-link";
import { getAppOrigins } from "@/lib/native/app-domains";

export function NativeShell() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const allowedOrigins = getAppOrigins();

    function handleIncomingUrl(incomingUrl: string) {
      const action = resolveNativeDeepLinkAction(incomingUrl, allowedOrigins);

      if (action.type === "ignore") {
        return;
      }

      if (action.type === "full-load") {
        window.location.href = action.href;
        return;
      }

      router.push(action.path);
    }

    void App.getLaunchUrl().then((result) => {
      if (result?.url) {
        handleIncomingUrl(result.url);
      }
    });

    let listenerHandle: { remove: () => Promise<void> } | null = null;

    void App.addListener("appUrlOpen", (event) => {
      handleIncomingUrl(event.url);
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      void listenerHandle?.remove();
    };
  }, [router]);

  return null;
}
