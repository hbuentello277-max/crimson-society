import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/nexus/auth";

export const dynamic = "force-dynamic";

export default async function NexusValidationPage() {
  const result = await getOwnerSession();

  if (!result.ok) {
    if (result.reason === "unauthenticated") {
      redirect("/login");
    }

    redirect("/profile");
  }

  const { session } = result;
  const { owner } = session;

  return (
    <main>
      <h1>Project Nexus</h1>
      <p>Owner Access Verified</p>
      <ul>
        <li>user id: {owner.userId}</li>
        <li>email: {owner.email ?? "—"}</li>
        <li>role: {owner.role ?? "—"}</li>
        <li>status: {owner.status ?? "—"}</li>
        <li>is_platform_owner: {String(owner.isPlatformOwner)}</li>
      </ul>
    </main>
  );
}
