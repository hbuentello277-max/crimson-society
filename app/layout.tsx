import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { LazyGlobalShopUI } from "@/components/shop/LazyGlobalShopUI";
import { AuthProvider } from "@/components/AuthProvider";
import { DeletionPendingGate } from "@/components/DeletionPendingGate";
import { RestrictedAccountGate } from "@/components/RestrictedAccountGate";
import { NativeShell } from "@/components/NativeShell";
import { LanguageProvider } from "@/components/LanguageProvider";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-serif",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Crimson Society",
  applicationName: "Crimson Society",
  description: "A society of riders.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "1024x1024", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Crimson Society",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} h-full w-full overflow-x-hidden`}>
      <body className="h-full w-full max-w-full overflow-x-hidden bg-[#050505] font-sans text-white antialiased">
        <AuthProvider>
          <LanguageProvider>
            <NativeShell />
            <DeletionPendingGate>
              <RestrictedAccountGate>
                {children}
              </RestrictedAccountGate>
            </DeletionPendingGate>
            <BottomNav />
            <LazyGlobalShopUI />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
