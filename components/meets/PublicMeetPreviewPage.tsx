"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { formatDashboardMeetTime } from "@/lib/dashboard/time";
import { meetVisibilityLabel } from "@/lib/meet-visibility";
import type { MeetPublicPreview } from "@/lib/meets/meet-preview-types";
import { buildMeetPublicUrl } from "@/lib/meets/meet-public-url";

const MeetMap = dynamic(() => import("@/components/MeetMap"), {
  ssr: false,
  loading: () => (
    <div className="h-56 animate-pulse rounded-[24px] border border-white/10 bg-white/[0.03]" />
  ),
});

type Props = {
  preview: MeetPublicPreview;
};

function authHref(path: "/login" | "/signup", meetId: string) {
  const params = new URLSearchParams({ next: `/meets/${meetId}` });
  return `${path}?${params.toString()}`;
}

export function PublicMeetPreviewPage({ preview }: Props) {
  const meetUrl = buildMeetPublicUrl(preview.id);
  const hasMapCoords =
    preview.isAccessible &&
    preview.lat != null &&
    preview.lng != null &&
    Number.isFinite(preview.lat) &&
    Number.isFinite(preview.lng);

  if (!preview.isAccessible) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 py-10 text-white sm:px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(180,20,30,0.22),transparent_65%)]" />
        <div className="relative mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-[0.34em] text-[#e87a82]">Crimson Society Meet</p>
          <h1 className="mt-4 font-serif text-4xl text-white">This meet is private</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            {preview.lockMessage || "Sign in to see if you have access to this meet."}
          </p>
          <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={authHref("/login", preview.id)}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#b4141e]/60 bg-[#b4141e]/25 px-6 py-2.5 text-xs uppercase tracking-[0.22em] text-[#f1c3c7] shadow-[0_0_20px_rgba(180,20,30,0.25)] transition hover:border-[#b4141e]/90 hover:bg-[#b4141e]/35"
            >
              Join This Meet
            </Link>
            <Link
              href={authHref("/signup", preview.id)}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-6 py-2.5 text-xs uppercase tracking-[0.22em] text-zinc-200 transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7]"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 pb-12 pt-8 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(180,20,30,0.22),transparent_65%)]" />
      <div className="relative mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/" className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 transition hover:text-[#e87a82]">
            Crimson Society
          </Link>
          <span className="rounded-full border border-[#b4141e]/35 bg-[#b4141e]/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#e87a82]">
            {meetVisibilityLabel(preview.visibility)}
          </span>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-[#120608] via-[#0b0b0d] to-[#070707]">
          <div className="relative h-52 w-full">
            <Image
              src={preview.cover}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/35 to-transparent" />
          </div>

          <div className="p-5 sm:p-6">
            <p className="text-[10px] uppercase tracking-[0.34em] text-[#e87a82]">{preview.type}</p>
            <h1 className="mt-2 font-serif text-4xl leading-tight text-white">{preview.name}</h1>
            <p className="mt-2 text-sm text-zinc-300">Hosted by {preview.hostName}</p>
            <p className="mt-3 text-sm text-zinc-400">
              {formatDashboardMeetTime(preview.date, preview.time)}
            </p>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <dt className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Starting Location</dt>
                <dd className="mt-2 text-sm text-zinc-200">{preview.meetPoint}</dd>
                <dd className="mt-1 text-xs text-zinc-500">{preview.city}</dd>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <dt className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Riders Joined</dt>
                <dd className="mt-2 font-serif text-3xl text-white">{preview.riderCount}</dd>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 sm:col-span-2">
                <dt className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Route</dt>
                <dd className="mt-2 text-sm text-zinc-200">
                  {preview.meetPoint} → {preview.destination}
                </dd>
                <dd className="mt-1 text-xs text-zinc-500">
                  {[preview.distance, preview.duration].filter(Boolean).join(" · ")}
                </dd>
              </div>
            </dl>

            {preview.description ? (
              <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <h2 className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">About this meet</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-300">{preview.description}</p>
              </div>
            ) : null}

            {hasMapCoords ? (
              <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10">
                <MeetMap
                  lat={preview.lat!}
                  lng={preview.lng!}
                  meetPoint={preview.meetPoint}
                  route={preview.route}
                  height={240}
                  compact
                  hideHint
                  interactive={false}
                  showMeetMarker
                  showDestination={preview.route.length > 1 || preview.destinationLat != null}
                  destinationPosition={
                    preview.destinationLat != null && preview.destinationLng != null
                      ? { lat: preview.destinationLat, lng: preview.destinationLng }
                      : preview.route.length > 0
                        ? preview.route[preview.route.length - 1]
                        : null
                  }
                />
              </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={authHref("/login", preview.id)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-[#b4141e]/60 bg-[#b4141e]/25 px-6 py-2.5 text-xs uppercase tracking-[0.22em] text-[#f1c3c7] shadow-[0_0_20px_rgba(180,20,30,0.25)] transition hover:border-[#b4141e]/90 hover:bg-[#b4141e]/35"
              >
                Join This Meet
              </Link>
              <Link
                href={authHref("/signup", preview.id)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-6 py-2.5 text-xs uppercase tracking-[0.22em] text-zinc-200 transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7]"
              >
                Create Free Account
              </Link>
            </div>

            <p className="mt-5 text-center text-[10px] uppercase tracking-[0.18em] text-zinc-600">
              {meetUrl}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
