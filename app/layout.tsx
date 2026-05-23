import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import CartDrawer from "@/components/CartDrawer";
import CartToast from "@/components/CartToast";
import { AuthProvider } from "@/components/AuthProvider";

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
  description: "A society of riders.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="bg-[#050505] font-sans text-white antialiased">
        <AuthProvider>
          {children}
          <BottomNav />
          <CartDrawer />
          <CartToast />
        </AuthProvider>
      </body>
    </html>
  );
}