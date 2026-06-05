"use client";

import Image from "next/image";
import { resolveStoredProductImageUrl } from "@/lib/shop/product-image-url";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  sizes?: string;
};

/**
 * Merch product image — always unoptimized so any Supabase/public URL works
 * without relying on next.config remotePatterns host matching.
 */
export function ShopProductImage({
  src,
  alt = "",
  className = "object-cover",
  sizes = "80px",
}: Props) {
  const resolved = resolveStoredProductImageUrl(src);
  if (!resolved) return null;

  return (
    <Image
      src={resolved}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      unoptimized
    />
  );
}
