"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Motorcycle = {
  id: string;
  label: string | null;
  name: string | null;
  year: string | null;
  finish: string | null;
  photo_url: string | null;
};

type LoadState = "idle" | "loading" | "loaded" | "error";

type Props = {
  userId: string | null;
};

function bikeInitial(bike: Motorcycle) {
  return (bike.name?.trim() || bike.label?.trim() || "R").charAt(0).toUpperCase();
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.025] p-8 text-center shadow-[0_20px_60px_-40px_rgba(0,0,0,0.95)]">
      <div className="mx-auto flex items-center justify-center gap-4">
        <span className="h-px w-10 bg-white/15" />
        <span className="text-[#b4141e]">✦</span>
        <span className="h-px w-10 bg-white/15" />
      </div>
      <p className="mt-5 font-serif text-2xl italic text-zinc-300">{title}</p>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-500">{body}</p>
    </div>
  );
}

export function ProfileGarageSection({ userId }: Props) {
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [state, setState] = useState<LoadState>("idle");

  const loadGarage = useCallback(async () => {
    if (!userId) return;
    setState("loading");

    const { data, error } = await supabase
      .from("motorcycles")
      .select("id, label, name, year, finish, photo_url")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      setState("error");
      return;
    }

    setMotorcycles((data as Motorcycle[]) ?? []);
    setState("loaded");
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void loadGarage();
  }, [loadGarage, userId]);

  useEffect(() => {
    if (!userId) return;
    const handleRefresh = () => {
      void loadGarage();
    };
    window.addEventListener("crimson:rider-onboarding-refresh", handleRefresh);
    return () => window.removeEventListener("crimson:rider-onboarding-refresh", handleRefresh);
  }, [loadGarage, userId]);

  if (state === "loading") {
    return <EmptyPanel title="Loading garage." body="Pulling your ride from the archive." />;
  }

  if (state === "error") {
    return (
      <EmptyPanel title="Garage could not load." body="Motorcycle details are unavailable right now." />
    );
  }

  if (state === "loaded" && motorcycles.length === 0) {
    return (
      <div className="rounded-[26px] border border-white/10 bg-white/[0.025] p-8 text-center shadow-[0_20px_60px_-40px_rgba(0,0,0,0.95)]">
        <div className="mx-auto flex items-center justify-center gap-4">
          <span className="h-px w-10 bg-white/15" />
          <span className="text-[#b4141e]">✦</span>
          <span className="h-px w-10 bg-white/15" />
        </div>
        <p className="mt-5 font-serif text-2xl italic text-zinc-300">Add Your Ride</p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-500">
          Tell the Society what you ride.
        </p>
        <Link
          href="/profile/edit"
          className="mt-6 inline-flex rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-5 py-2 text-xs uppercase tracking-[0.2em] text-[#f1c3c7] transition hover:border-[#b4141e]/70"
        >
          Add Ride
        </Link>
      </div>
    );
  }

  if (state !== "loaded") return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {motorcycles.map((bike, index) => (
        <article
          key={bike.id}
          className="overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-b from-[#0f0f10] to-[#070707]"
        >
          <div className="relative aspect-[4/3] bg-black">
            {bike.photo_url ? (
              <Image
                src={bike.photo_url}
                alt={bike.name || "Ride photo"}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                priority={index === 0}
                className="object-cover"
                unoptimized={bike.photo_url.includes("supabase")}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(180,20,30,0.22),transparent_58%)] font-serif text-5xl text-[#f0c8cb]">
                {bikeInitial(bike)}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-transparent to-transparent" />
          </div>
          <div className="border-b border-white/10 px-5 py-5">
            <p className="text-[10px] uppercase tracking-[0.32em] text-zinc-500">
              {bike.label || "Garage"}
            </p>
            <h3 className="mt-3 font-serif text-3xl leading-none text-white">
              {bike.name || "Unnamed Ride"}
            </h3>
            <p className="mt-3 text-sm text-zinc-400">{bike.year || "Year pending"}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
