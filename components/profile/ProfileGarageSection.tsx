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

  return (
    <section className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Garage</p>
          <h2 className="mt-1 font-serif text-xl text-white">Your Ride</h2>
        </div>
        <Link
          href="/profile/edit"
          className="rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-[#b4141e]/50 hover:text-white"
        >
          Add Ride
        </Link>
      </div>

      {state === "loading" ? (
        <p className="mt-4 text-sm text-zinc-500">Loading garage…</p>
      ) : null}

      {state === "error" ? (
        <p className="mt-4 text-sm text-zinc-500">Garage could not load.</p>
      ) : null}

      {state === "loaded" && motorcycles.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-5 text-center">
          <p className="font-serif text-xl text-zinc-300">Add Your Ride</p>
          <p className="mt-2 text-sm text-zinc-500">Tell the Society what you ride.</p>
          <Link
            href="/profile/edit"
            className="mt-4 inline-flex rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-5 py-2 text-xs uppercase tracking-[0.2em] text-[#f1c3c7] transition hover:border-[#b4141e]/70"
          >
            Add Your Ride
          </Link>
        </div>
      ) : null}

      {state === "loaded" && motorcycles.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {motorcycles.map((bike) => (
            <article
              key={bike.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"
            >
              <div className="relative aspect-[16/10] bg-black">
                {bike.photo_url ? (
                  <Image
                    src={bike.photo_url}
                    alt={bike.name || "Ride photo"}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover"
                    unoptimized={bike.photo_url.includes("supabase")}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(180,20,30,0.22),transparent_58%)] font-serif text-4xl text-[#f0c8cb]">
                    {bikeInitial(bike)}
                  </div>
                )}
              </div>
              <div className="px-4 py-3">
                <p className="text-sm font-medium text-white">{bike.name || "Unnamed Ride"}</p>
                <p className="mt-1 text-xs text-zinc-500">{bike.year || "Year pending"}</p>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
