import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PublicMeetPreviewPage } from "@/components/meets/PublicMeetPreviewPage";
import { loadMeetPublicPreview } from "@/lib/meets/load-meet-preview";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const preview = await loadMeetPublicPreview(id, supabase);

  if (!preview?.isAccessible) {
    return {
      title: "Crimson Society Meet",
      description: "Join riders on Crimson Society.",
    };
  }

  return {
    title: `${preview.name} | Crimson Society`,
    description: `Hosted by ${preview.hostName}. Join this meet on Crimson Society.`,
    openGraph: {
      title: preview.name,
      description: `Hosted by ${preview.hostName}. Join this meet on Crimson Society.`,
      images: preview.cover ? [{ url: preview.cover }] : undefined,
    },
  };
}

export default async function MeetPublicPreviewRoute({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { section } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const preview = await loadMeetPublicPreview(id, supabase);

  if (!preview) {
    notFound();
  }

  if (preview.status === "canceled") {
    notFound();
  }

  if (user && preview.canOpenInApp) {
    const query = new URLSearchParams({ meet: id });
    if (section) {
      query.set("section", section);
    }
    redirect(`/meets?${query.toString()}`);
  }

  return <PublicMeetPreviewPage preview={preview} />;
}
