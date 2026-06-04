import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import {
  SHOP_PRODUCT_IMAGES_BUCKET,
  SHOP_PRODUCT_IMAGE_MAX_BYTES,
  isShopProductImageMime,
  shopProductImageExtension,
} from "@/lib/shop/product-images";

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const productId = formData.get("product_id");
  const file = formData.get("file");

  if (typeof productId !== "string" || !productId.trim()) {
    return NextResponse.json({ error: "product_id is required" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (!isShopProductImageMime(file.type)) {
    return NextResponse.json(
      { error: "Only JPG, PNG, and WebP images are allowed." },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > SHOP_PRODUCT_IMAGE_MAX_BYTES) {
    return NextResponse.json(
      { error: `Image must be between 1 byte and ${SHOP_PRODUCT_IMAGE_MAX_BYTES / (1024 * 1024)}MB.` },
      { status: 400 },
    );
  }

  try {
    const adminClient = createAdminServiceClient();

    const { data: product, error: productError } = await adminClient
      .from("products")
      .select("id")
      .eq("id", productId.trim())
      .maybeSingle();

    if (productError) {
      return NextResponse.json({ error: productError.message }, { status: 500 });
    }

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const ext = shopProductImageExtension(file.type);
    const objectPath = `${product.id}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminClient.storage
      .from(SHOP_PRODUCT_IMAGES_BUCKET)
      .upload(objectPath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const { data: publicUrlData } = adminClient.storage
      .from(SHOP_PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(objectPath);

    return NextResponse.json({
      url: publicUrlData.publicUrl,
      path: objectPath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
