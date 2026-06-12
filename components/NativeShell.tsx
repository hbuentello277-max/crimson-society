"use client";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { applyNativeDeepLink } from "@/lib/navigation/apply-native-deep-link";
import { getAppOrigins } from "@/lib/native/app-domains";
import { initializeNativeIosPushListeners } from "@/lib/push/native-ios";

export function NativeShell() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const allowedOrigins = getAppOrigins();

    function handleIncomingUrl(incomingUrl: string) {
      applyNativeDeepLink(incomingUrl, allowedOrigins, (path) => {
        router.push(path);
      });
    }

    const cleanupPush = initializeNativeIosPushListeners(handleIncomingUrl);

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
      cleanupPush?.();
      void listenerHandle?.remove();
    };
  }, [router]);

  return null;
}
