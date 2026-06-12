import { Capacitor } from "@capacitor/core";

export function isNativeCapacitorPlatform() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export function getCapacitorPlatform() {
  if (typeof window === "undefined") {
    return "web";
  }

  return Capacitor.getPlatform();
}
