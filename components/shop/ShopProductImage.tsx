"use client";

import { resolveStoredProductImageUrl } from "@/lib/shop/product-image-url";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
};

/**
 * Merch product image — native img so any Supabase/public URL loads without
 * Next.js remotePatterns or Image optimizer constraints.
 */
export function ShopProductImage({
  src,
  alt = "",
  className = "object-cover",
}: Props) {
  const resolved = resolveStoredProductImageUrl(src);
  if (!resolved) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      className={`absolute inset-0 h-full w-full ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
}
