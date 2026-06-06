export const dynamic = "force-dynamic";

import { CommandDetail } from "@/components/nexus/commands/CommandDetail";

export default async function NexusCommandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CommandDetail commandId={id} />;
}
