import { redirect } from "next/navigation";

export default function AdminRewardsRedirectPage() {
  redirect("/admin/shop?tab=redemptions");
}
