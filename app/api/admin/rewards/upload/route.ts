import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import {
  CRIMSON_CREDIT_REWARD_IMAGES_BUCKET,
  crimsonCreditRewardImagePublicUrl,
} from "@/lib/credits/reward-images";
import {
  SHOP_PRODUCT_IMAGE_MAX_BYTES,
  SHOP_PRODUCT_IMAGE_MIME_TYPES,
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

  const rewardId = formData.get("reward_id");
  const file = formData.get("file");

  if (typeof rewardId !== "string" || !rewardId.trim()) {
    return NextResponse.json({ error: "reward_id is required" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (!isShopProductImageMime(file.type)) {
    return NextResponse.json(
      { error: `Only ${SHOP_PRODUCT_IMAGE_MIME_TYPES.join(", ")} images are allowed.` },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > SHOP_PRODUCT_IMAGE_MAX_BYTES) {
    return NextResponse.json(
      {
        error: `Image must be between 1 byte and ${SHOP_PRODUCT_IMAGE_MAX_BYTES / (1024 * 1024)}MB.`,
      },
      { status: 400 },
    );
  }

  const admin = createAdminServiceClient();

  const { data: reward, error: rewardError } = await admin
    .from("crimson_credit_rewards")
    .select("id")
    .eq("id", rewardId.trim())
    .maybeSingle();

  if (rewardError) {
    return NextResponse.json({ error: rewardError.message }, { status: 500 });
  }

  if (!reward) {
    return NextResponse.json({ error: "Reward not found" }, { status: 404 });
  }

  const ext = shopProductImageExtension(file.type);
  const objectPath = `${reward.id}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(CRIMSON_CREDIT_REWARD_IMAGES_BUCKET)
    .upload(objectPath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: updated, error: updateError } = await admin
    .from("crimson_credit_rewards")
    .update({ image_path: objectPath })
    .eq("id", reward.id)
    .select("id, image_path")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    path: updated.image_path,
    url: crimsonCreditRewardImagePublicUrl(updated.image_path),
  });
}
