export const CRIMSON_CREDIT_REWARD_IMAGES_BUCKET = "crimson-credit-reward-images";

export function crimsonCreditRewardImagePublicUrl(imagePath: string | null | undefined) {
  if (!imagePath?.trim()) return null;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;

  const path = imagePath.replace(/^\//, "");
  return `${base}/storage/v1/object/public/${CRIMSON_CREDIT_REWARD_IMAGES_BUCKET}/${path}`;
}
