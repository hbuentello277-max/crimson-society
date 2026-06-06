import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/nexus/auth";

export const dynamic = "force-dynamic";

export default async function NexusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getOwnerSession();

  if (!result.ok) {
    if (result.reason === "unauthenticated") {
      redirect("/login");
    }

    redirect("/profile");
  }

  return children;
}
