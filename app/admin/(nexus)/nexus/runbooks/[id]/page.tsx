export const dynamic = "force-dynamic";

import { RunbookDetail } from "@/components/nexus/runbooks/RunbookDetail";

export default async function NexusRunbookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RunbookDetail runbookId={id} />;
}
