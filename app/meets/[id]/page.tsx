import { redirect } from "next/navigation";

export default async function MeetDetailRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const { id } = await params;
  const { section } = await searchParams;
  const query = new URLSearchParams({ meet: id });
  if (section) {
    query.set("section", section);
  }
  redirect(`/meets?${query.toString()}`);
}
