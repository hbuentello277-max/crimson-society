"use client";

import dynamic from "next/dynamic";

const CartDrawer = dynamic(() => import("@/components/CartDrawer"), { ssr: false });
const CartToast = dynamic(() => import("@/components/CartToast"), { ssr: false });

export function LazyGlobalShopUI() {
  return (
    <>
      <CartDrawer />
      <CartToast />
    </>
  );
}
