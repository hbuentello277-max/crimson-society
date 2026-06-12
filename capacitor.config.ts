import type { CapacitorConfig } from "@capacitor/cli";

const productionServerUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "https://crimsonsociety.app";

const config: CapacitorConfig = {
  appId: "com.crimsonsociety.app",
  appName: "Crimson Society",
  webDir: "capacitor-www",
  server: {
    url: productionServerUrl,
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
    scheme: "crimsonsociety",
  },
};

export default config;
