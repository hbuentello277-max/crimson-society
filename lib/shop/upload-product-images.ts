import {
  SHOP_PRODUCT_IMAGE_MAX_BYTES,
  SHOP_PRODUCT_IMAGE_MIME_TYPES,
} from "@/lib/shop/product-images";

export function validateShopProductImageFile(file: File): string | null {
  if (!(SHOP_PRODUCT_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name}: only JPG, PNG, and WebP are allowed.`;
  }
  if (file.size > SHOP_PRODUCT_IMAGE_MAX_BYTES) {
    return `${file.name}: exceeds 5MB limit.`;
  }
  return null;
}

/** Uploads files via the existing admin shop upload API. */
export async function uploadShopProductImages(
  productId: string,
  files: File[],
): Promise<string[]> {
  const uploaded: string[] = [];

  for (const file of files) {
    const validationError = validateShopProductImageFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const body = new FormData();
    body.set("product_id", productId);
    body.set("file", file);

    const res = await fetch("/api/admin/shop/upload", {
      method: "POST",
      body,
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      throw new Error(data.error ?? `Failed to upload ${file.name}`);
    }
    uploaded.push(data.url);
  }

  return uploaded;
}
