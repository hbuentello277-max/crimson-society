"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import type { Ride } from "@/app/rides/page";
import Link from "next/link";

const RideMap = dynamic(() => import("@/components/RideMap"), { ssr: false });

interface Props {
  ride: Ride;
  isGoing: boolean;
  onJoin: () => void;
  onClose: () => void;
}

export function RideDetailsModal({ ride, isGoing, onJoin, onClose }: Props) {
  // Validate route data — must be array of { lat, lng } with real numbers
  const safeRoute =
    Array.isArray(ride.route) &&
    ride.route.length > 0 &&
    ride.route.every(
      (p) =>
        typeof p.lat === "number" &&
        typeof p.lng === "number" &&
        isFinite(p.lat) &&
        isFinite(p.lng)
    )
      ? ride.route
      : [];

  const hasRoute = safeRoute.length > 0;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ride.name}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      {/* Backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-[#0d0608] border border-white/10 shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden">

        {/* Cover image */}
        <div className="relative h-44 shrink-0 overflow-hidden">
          <Image
            src={ride.cover}
            alt={ride.name}
            fill
            sizes="(max-width: 512px) 100vw, 512px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0608] via-[#0d0608]/40 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/15 flex items-center justify-center text-zinc-300 hover:text-white transition"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            <span className="rounded-full border border-white/20 bg-black/50 backdrop-blur-sm px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-zinc-200">
              {ride.type}
            </span>
            {ride.privacy === "Invite" && (
              <span className="rounded-full border border-[#7f111b]/60 bg-[#7f111b]/20 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#f4dadd]">
                Invite Only
              </span>
            )}
          </div>

          {/* Ride title over image */}
          <div className="absolute bottom-3 left-4 right-12">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-0.5">
              {ride.date} / {ride.time}
            </p>
            <h2 className="text-lg font-semibold text-white leading-tight">{ride.name}</h2>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="max-h-[60vh] overflow-y-auto px-5 pb-6 pt-5 sm:max-h-[50vh]">

          {/* Map / Route */}
          <div
            className="mb-5 overflow-hidden rounded-lg border border-white/10"
            style={{ height: 260, touchAction: "none" }}
          >
            {hasRoute ? (
              <RideMap
                lat={ride.lat}
                lng={ride.lng}
                meetPoint={ride.meetPoint}
                route={safeRoute}
                height={260}
                interactive
                hideHint
                showDestination={safeRoute.length > 1}
                showWaypoints={Array.isArray(ride.waypoints) && ride.waypoints.length > 0}
                waypoints={ride.waypoints ?? []}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
                  Route map unavailable
                </p>
              </div>
            )}
          </div>

          {/* Route info grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoCell label="Meetup" value={ride.meetPoint} />
            <InfoCell label="Destination" value={ride.destination} />
            <InfoCell label="Distance" value={ride.distance} />
            <InfoCell label="Duration" value={ride.duration} />
          </div>

          {/* Description */}
          <div className="mt-5">
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">About this ride</p>
            <p className="text-sm leading-6 text-zinc-300">{ride.description}</p>
          </div>

          {/* Host */}
          <div className="mt-5">
            <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-zinc-500">Hosted by</p>
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/10">
                <Image src={ride.host.photo} alt={ride.host.name} fill sizes="36px" className="object-cover" />
              </div>
              <span className="text-sm text-zinc-200">{ride.host.name}</span>
            </div>
          </div>

          {/* Who's going */}
          <div className="mt-5">
            <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Who&apos;s going &mdash; {ride.going.length + (isGoing ? 1 : 0)} riders
            </p>
            <div className="flex flex-wrap gap-2">
              {ride.going.map((rider) => (
                <div key={rider.name} className="flex items-center gap-2">
                  <div className="relative h-7 w-7 overflow-hidden rounded-full border border-white/10">
                    <Image src={rider.photo} alt={rider.name} fill sizes="28px" className="object-cover" />
                  </div>
                  <span className="text-xs text-zinc-400">{rider.name}</span>
                </div>
              ))}
              {isGoing && (
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-[#7f111b]/40 border border-[#7f111b]/60 flex items-center justify-center text-[10px] text-[#f4dadd]">Y</div>
                  <span className="text-xs text-zinc-400">You</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 flex gap-3 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 border-t border-white/8">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-white/15 bg-white/[0.03] py-3 text-[10px] uppercase tracking-[0.2em] text-zinc-400 transition hover:border-white/25 hover:text-zinc-200"
          >
            Close
          </button>
                      <Link
            href="/rides/track"
            onClick={() => {
              sessionStorage.setItem("crimson-active-ride", JSON.stringify({
                route: ride.route,
                waypoints: ride.waypoints,
                name: ride.name,
                meetPoint: ride.meetPoint,
                destination: ride.destination
              }));
            }}
                                >
            Start Ride Tracking
          </Link>
          <button
            onClick={() => { onJoin(); }}
            className={`flex-1 rounded-lg border py-3 text-[10px] uppercase tracking-[0.2em] transition ${
              isGoing
                ? "border-[#7f111b]/80 bg-[#7f111b]/30 text-[#f4dadd]"
                : "border-white/15 bg-white/[0.02] text-zinc-100 hover:border-[#7f111b]/60 hover:bg-[#7f111b]/18"
            }`}
          >
            {isGoing ? "\u2713 Going" : "JOIN RIDE"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <p className="mb-1 text-[9px] uppercase tracking-[0.18em] text-zinc-600">{label}</p>
      <p className="text-xs font-medium text-zinc-300">{value}</p>
    </div>
  );
}
