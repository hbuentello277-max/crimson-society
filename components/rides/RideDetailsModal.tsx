"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import type { Ride } from "@/app/rides/page";

const RideMap = dynamic(() => import("@/components/RideMap"), { ssr: false });

interface Props {
  ride: Ride;
  isGoing: boolean;
  onJoin: () => void;
  onClose: () => void;
}

export function RideDetailsModal({ ride, isGoing, onJoin, onClose }: Props) {
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
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-t-2xl border border-white/10 bg-[#0d080a] shadow-[0_-24px_80px_rgba(0,0,0,0.9)] sm:rounded-2xl">
        {/* Cover image */}
        <div className="relative h-52 sm:h-64">
          <Image
            src={ride.cover}
            alt={ride.name}
            fill
            sizes="(max-width: 768px) 100vw, 672px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d080a] via-[#0d080a30] to-transparent" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/50 text-zinc-300 backdrop-blur-md transition hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>

          {/* Badges */}
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <span className="rounded-md border border-white/15 bg-black/45 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-zinc-100 backdrop-blur-md">
              {ride.type}
            </span>
            {ride.privacy === "Invite" && (
              <span className="rounded-md border border-[#7f111b]/45 bg-[#7f111b]/20 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-[#f0c9ce] backdrop-blur-md">
                Invite Only
              </span>
            )}
          </div>

          {/* Ride title over image */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#d85f6c]">
              {ride.date} / {ride.time}
            </p>
            <h2 className="mt-1 font-serif text-[32px] leading-none text-[#f4f0ea] sm:text-[40px]">
              {ride.name}
            </h2>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="max-h-[60vh] overflow-y-auto px-5 pb-6 pt-5 sm:max-h-[50vh]">
{/* Map / Route */}
                  <div className="mb-5 overflow-hidden rounded-lg border border-white/10">
                              <RideMap
                                            lat={ride.lat}
                                            lng={ride.lng}
                                            meetPoint={ride.meetPoint}
                                            route={ride.route ?? []}
                                            height={260}
                                            compact
                                            hideHint
                                          />
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
                <div key={rider.name} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3">
                  <div className="relative h-6 w-6 overflow-hidden rounded-full">
                    <Image src={rider.photo} alt={rider.name} fill sizes="24px" className="object-cover" />
                  </div>
                  <span className="text-[11px] text-zinc-300">{rider.name}</span>
                </div>
              ))}
              {isGoing && (
                <div className="flex items-center gap-2 rounded-full border border-[#7f111b]/40 bg-[#7f111b]/15 py-1 pl-2 pr-3">
                  <span className="text-[11px] text-[#f4dadd]">You</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="border-t border-white/8 px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/12 bg-white/[0.03] py-3 text-[10px] uppercase tracking-[0.2em] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => { onJoin(); }}
              className={`flex-1 rounded-lg border py-3 text-[10px] uppercase tracking-[0.2em] transition ${
                isGoing
                  ? "border-[#7f111b]/80 bg-[#7f111b]/30 text-[#f4dadd]"
                  : "border-white/15 bg-white/[0.02] text-zinc-100 hover:border-[#7f111b]/60 hover:bg-[#7f111b]/18"
              }`}
            >
              {isGoing ? "✓ Going" : "JOIN RIDE"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.025] px-3 py-3">
      <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-600">{label}</p>
      <p className="mt-1 text-sm font-medium text-zinc-200">{value}</p>
    </div>
  );
}
