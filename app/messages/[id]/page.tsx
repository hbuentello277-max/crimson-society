import { redirect } from "next/navigation";

export default async function MessageThreadRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/inbox?conversation=${encodeURIComponent(id)}`);
}
