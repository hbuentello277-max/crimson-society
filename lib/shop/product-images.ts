export const SHOP_PRODUCT_IMAGES_BUCKET = "shop-product-images";

export const SHOP_PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const SHOP_PRODUCT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ShopProductImageMime = (typeof SHOP_PRODUCT_IMAGE_MIME_TYPES)[number];

export function isShopProductImageMime(value: string): value is ShopProductImageMime {
  return (SHOP_PRODUCT_IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

export function shopProductImageExtension(mime: ShopProductImageMime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "webp";
}
