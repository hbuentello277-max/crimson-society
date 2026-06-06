export const dynamic = "force-dynamic";

import { WarRoomDetail } from "@/components/nexus/war-room/WarRoomDetail";

export default async function NexusWarRoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WarRoomDetail warRoomId={id} />;
}
