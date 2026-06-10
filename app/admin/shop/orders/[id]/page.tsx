import { redirect } from "next/navigation";

export default async function AdminShopOrderRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/shop?tab=orders&order=${encodeURIComponent(id)}`);
}
