"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { csPill } from "@/lib/crimson-accent";
import { supabase } from "@/lib/supabase";
import { requireCompleteProfile } from "@/lib/requireCompleteProfile";

type Status = "none" | "pending" | "requested" | "connected";

type Member = {
  id: string;
  handle: string;
  name: string;
  city: string;
  bike: string;
  style: string[];
  rides: number;
  photo: string | null;
  bio: string;
  mutualCount: number;
  suggestionReason: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  profile_image_url: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  riding_area: string | null;
  bike_type: string | null;
  riding_style: string | null;
  profile_tags: string[] | null;
  hide_location_from_suggestions: boolean | null;
};

type MotorcycleRow = {
  user_id: string;
  name: string | null;
  label: string | null;
  year: string | null;
  finish: string | null;
};

type ConnectionRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined";
};

type BlockRow = {
  blocker_id: string;
  blocked_id: string;
};

const FILTERS = ["All", "Street", "Track", "Touring", "Stunt", "Cruiser"];

const PROFILE_BASE_SELECT =
  "id, username, display_name, full_name, profile_image_url, avatar_url, bio, location, status";

const PROFILE_DISCOVERY_SELECT = `${PROFILE_BASE_SELECT}, city, state, riding_area, bike_type, riding_style, profile_tags, hide_location_from_suggestions, hide_from_suggestions`;

function isMissingProfileColumn(error?: { message?: string; code?: string } | null) {
  return error?.code === "42703" || /column profiles\..+ does not exist/i.test(error?.message ?? "");
}

function displayName(profile: ProfileRow) {
  return profile.display_name || profile.full_name || profile.username || "Crimson Rider";
}

function handleFor(profile: ProfileRow) {
  return profile.username ? `@${profile.username}` : "@member";
}

function avatarFor(profile: ProfileRow) {
  return profile.profile_image_url || profile.avatar_url || null;
}

function cityFor(profile: ProfileRow) {
  if (profile.hide_location_from_suggestions) return "Region private";
  if (profile.city && profile.state) return `${profile.city}, ${profile.state}`;
  if (profile.city) return profile.city;
  if (profile.riding_area) return profile.riding_area;
  return profile.location || "Riding area pending";
}

function styleFor(profile: ProfileRow) {
  const styles = [profile.riding_style, ...(profile.profile_tags || [])]
    .filter(Boolean)
    .map((item) => item as string);

  return styles.length > 0 ? styles.slice(0, 3) : ["Street"];
}

function connectionKeyFor(a: string, b: string) {
  return [a, b].sort().join(":");
}

function connectionStatus(row: ConnectionRow | undefined, userId: string): Status {
  if (!row) return "none";
  if (row.status === "accepted") return "connected";
  if (row.status === "pending") {
    return row.requester_id === userId ? "pending" : "requested";
  }
  return "none";
}

function mutualCountFor(targetId: string, accepted: ConnectionRow[], myConnectionIds: Set<string>) {
  const targetConnections = accepted
    .filter((connection) => connection.requester_id === targetId || connection.addressee_id === targetId)
    .map((connection) =>
      connection.requester_id === targetId ? connection.addressee_id : connection.requester_id,
    );

  return targetConnections.filter((id) => myConnectionIds.has(id)).length;
}

function suggestionReasonFor(profile: ProfileRow, me: ProfileRow | null, mutualCount: number) {
  if (mutualCount > 0) return `${mutualCount} mutual connection${mutualCount === 1 ? "" : "s"}`;
  if (me?.city && profile.city && me.city.toLowerCase() === profile.city.toLowerCase()) {
    return "Same city scene";
  }
  if (me?.state && profile.state && me.state.toLowerCase() === profile.state.toLowerCase()) {
    return "Same state scene";
  }
  if (me?.riding_style && profile.riding_style && me.riding_style === profile.riding_style) {
    return "Similar riding style";
  }
  if (me?.bike_type && profile.bike_type && me.bike_type === profile.bike_type) {
    return "Similar machine";
  }
  return profile.riding_area ? "Shared riding scene" : "Crimson Society rider";
}

function profileHrefFromHandle(handle: string) {
  if (!handle || handle === "@member") return null;
  const username = handle.replace(/^@+/, "").trim();
  if (!username) return null;
  return `/profile/${username}`;
}

export default function ConnectPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user?.id ?? null;
  const [members, setMembers] = useState<Member[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
  if (authLoading) return;

  if (!session?.user?.id) {
    router.replace("/login");
    return;
  }

  let active = true;

  const checkProfileSetup = async () => {
    try {
      const complete = await requireCompleteProfile(session.user.id);

      if (active && !complete) {
        router.replace("/profile/setup");
      }
    } catch {
      if (active) {
        router.replace("/profile/setup");
      }
    }
  };

  void checkProfileSetup();

  return () => {
    active = false;
  };
}, [authLoading, session, router]);

  const loadConnections = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setErrorMsg("");

    const [profilesResponse, motorcyclesResponse, connectionsResponse, blocksResponse] =
      await Promise.all([
        (async () => {
          const discoveryResponse = await supabase
            .from("profiles")
            .select(PROFILE_DISCOVERY_SELECT)
            .eq("status", "active")
            .neq("id", userId)
            .eq("hide_from_suggestions", false)
            .limit(80);

          if (!isMissingProfileColumn(discoveryResponse.error)) {
            return discoveryResponse;
          }

          return supabase
            .from("profiles")
            .select(PROFILE_BASE_SELECT)
            .eq("status", "active")
            .neq("id", userId)
            .limit(80);
        })(),
        supabase.from("motorcycles").select("user_id, name, label, year, finish"),
        supabase
          .from("user_connections")
          .select("id, requester_id, addressee_id, status")
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
        supabase
          .from("user_blocks")
          .select("blocker_id, blocked_id")
          .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
      ]);

    if (profilesResponse.error || connectionsResponse.error || blocksResponse.error) {
      setMembers([]);
      setErrorMsg(
        profilesResponse.error?.message ||
          connectionsResponse.error?.message ||
          blocksResponse.error?.message ||
          "Could not load riders.",
      );
      setLoading(false);
      return;
    }

    const profiles = (profilesResponse.data || []) as unknown as ProfileRow[];
    const motorcycles = ((motorcyclesResponse.data || []) as MotorcycleRow[]) || [];
    const connections = ((connectionsResponse.data || []) as ConnectionRow[]) || [];
    const blocks = ((blocksResponse.data || []) as BlockRow[]) || [];
    const motorcycleMap = new Map(motorcycles.map((bike) => [bike.user_id, bike]));

    const blockedIds = new Set(
      blocks.map((block) => (block.blocker_id === userId ? block.blocked_id : block.blocker_id)),
    );

    const myProfileResponse = await (async () => {
      const discoveryResponse = await supabase
        .from("profiles")
        .select("id, city, state, riding_area, bike_type, riding_style, profile_tags")
        .eq("id", userId)
        .maybeSingle();

      if (!isMissingProfileColumn(discoveryResponse.error)) {
        return discoveryResponse;
      }

      return supabase.from("profiles").select("id, location").eq("id", userId).maybeSingle();
    })();

    const myProfile = (myProfileResponse.data as ProfileRow | null) ?? null;
    const acceptedConnections = connections.filter((connection) => connection.status === "accepted");

    const myConnectionIds = new Set(
      acceptedConnections.map((connection) =>
        connection.requester_id === userId ? connection.addressee_id : connection.requester_id,
      ),
    );

    const statusMap: Record<string, Status> = {};

    connections.forEach((connection) => {
      const otherId =
        connection.requester_id === userId ? connection.addressee_id : connection.requester_id;
      statusMap[otherId] = connectionStatus(connection, userId);
    });

    const nextMembers = profiles
      .filter((profile) => !blockedIds.has(profile.id))
      .map((profile) => {
        const bike = motorcycleMap.get(profile.id);
        const mutualCount = mutualCountFor(profile.id, acceptedConnections, myConnectionIds);

        return {
          id: profile.id,
          handle: handleFor(profile),
          name: displayName(profile),
          city: cityFor(profile),
          bike: profile.bike_type || bike?.name || bike?.label || "Motorcycle pending",
          style: styleFor(profile),
          rides: 0,
          photo: avatarFor(profile),
          bio: profile.bio || "Crimson Society rider.",
          mutualCount,
          suggestionReason: suggestionReasonFor(profile, myProfile, mutualCount),
        };
      })
      .sort((a, b) => b.mutualCount - a.mutualCount || a.name.localeCompare(b.name));

    setMembers(nextMembers);
    setStatuses(statusMap);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (authLoading || !userId) return;

    const timer = window.setTimeout(() => {
      void loadConnections();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [authLoading, loadConnections, userId]);

  async function handleConnect(id: string) {
    if (!userId || id === userId) return;

    const status = statuses[id] ?? "none";

    if (status === "pending" || status === "connected") {
      return;
    }

    if (status === "none") {
      setStatuses((prev) => ({ ...prev, [id]: "pending" }));

      const { data: existing, error: checkError } = await supabase
        .from("user_connections")
        .select("id, requester_id, addressee_id, status")
        .eq("connection_key", connectionKeyFor(userId, id))
        .maybeSingle();

      if (checkError) {
        setStatuses((prev) => ({ ...prev, [id]: "none" }));
        setErrorMsg("Could not check connection status.");
        return;
      }

      if (existing) {
        const existingStatus = connectionStatus(
          existing as ConnectionRow,
          userId,
        );
        setStatuses((prev) => ({ ...prev, [id]: existingStatus }));
        if (existingStatus === "pending" || existingStatus === "requested") {
          setErrorMsg("Connection request already pending.");
        }
        return;
      }

      const { error } = await supabase.from("user_connections").insert({
        requester_id: userId,
        addressee_id: id,
        connection_key: connectionKeyFor(userId, id),
        status: "pending",
      });

      if (error) {
        if (
          error.code === "23505" ||
          /user_connections_connection_key_key/i.test(error.message ?? "")
        ) {
          const { data: latest } = await supabase
            .from("user_connections")
            .select("id, requester_id, addressee_id, status")
            .eq("connection_key", connectionKeyFor(userId, id))
            .maybeSingle();
          setStatuses((prev) => ({
            ...prev,
            [id]: latest
              ? connectionStatus(latest as ConnectionRow, userId)
              : "pending",
          }));
          setErrorMsg("Connection request already pending.");
          return;
        }
        setStatuses((prev) => ({ ...prev, [id]: "none" }));
        setErrorMsg("Could not send connection request.");
      }
      return;
    }

    if (status === "requested") {
      setStatuses((prev) => ({ ...prev, [id]: "connected" }));

      const { error } = await supabase
        .from("user_connections")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("requester_id", id)
        .eq("addressee_id", userId)
        .eq("status", "pending");

      if (error) {
        setStatuses((prev) => ({ ...prev, [id]: "requested" }));
        setErrorMsg(error.message);
      }
    }
  }

  async function handleCancelRequest(id: string) {
    if (!userId || id === userId) return;

    const previousStatus = statuses[id] ?? "pending";
    setStatuses((prev) => ({ ...prev, [id]: "none" }));

    const { error } = await supabase
      .from("user_connections")
      .delete()
      .eq("connection_key", connectionKeyFor(userId, id))
      .eq("requester_id", userId)
      .eq("status", "pending");

    if (error) {
      console.error("Cancel request failed:", error);
      setStatuses((prev) => ({ ...prev, [id]: previousStatus }));
      setErrorMsg("Could not cancel request.");
    }
  }

  const filtered = useMemo(
    () =>
      members.filter((m) => {
        const matchesFilter = filter === "All" || m.style.includes(filter);
        const q = query.trim().toLowerCase();
        const matchesQuery =
          !q ||
          m.name.toLowerCase().includes(q) ||
          m.handle.toLowerCase().includes(q) ||
          m.city.toLowerCase().includes(q) ||
          m.bike.toLowerCase().includes(q);

        return matchesFilter && matchesQuery;
      }),
    [filter, members, query],
  );

  const suggested = useMemo(
    () => filtered.filter((member) => statuses[member.id] !== "connected").slice(0, 5),
    [filtered, statuses],
  );

  const openMember = openId ? members.find((m) => m.id === openId) ?? null : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050405] text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 48% at 50% 0%, rgba(104,0,11,0.44), transparent 58%),
            radial-gradient(ellipse 70% 36% at 50% 18%, rgba(127,17,27,0.16), transparent 70%),
            linear-gradient(180deg, rgba(127,17,27,0.06) 0%, rgba(0,0,0,0) 32%)
          `,
        }}
      />

      <div className="relative mx-auto max-w-3xl px-6 pb-20 pt-12">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-sm uppercase tracking-[0.3em] text-zinc-500 transition hover:text-[#e87a82]"
          >
            ← Return
          </Link>

          <span className="text-xs uppercase tracking-[0.4em] text-zinc-600">Pillar I</span>
        </div>

        <header className="mt-10 text-center">
          <div className="mx-auto flex items-center justify-center gap-4">
            <span className="h-px w-12 bg-white/20" />
            <span className="text-xl text-[#b4141e]">✦</span>
            <span className="h-px w-12 bg-white/20" />
          </div>

          <h1 className="mt-6 font-serif text-7xl leading-none">Connect</h1>

          <p className="mt-4 font-serif text-3xl italic text-[#e87a82]">Find riders near you.</p>

          <p className="mx-auto font-serif text-[17px] leading-relaxed text-zinc-400">
            Browse the Order. Request a ride. Build your inner circle.
          </p>
        </header>

        <section className="mt-10">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.02] px-4 py-4 backdrop-blur-sm sm:px-5">
            <div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or city"
                className="w-full rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-[15px] text-zinc-200 placeholder:text-zinc-600 transition focus:border-[#b4141e]/60 focus:outline-none focus:ring-2 focus:ring-[#b4141e]/20"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5 sm:gap-2">
              {FILTERS.map((f) => {
                const active = filter === f;

                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={csPill(active)}
                  >
                    {f}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-[11px] uppercase tracking-[0.34em] text-zinc-500">
              {filtered.length} {filtered.length === 1 ? "Rider" : "Riders"}
            </p>
          </div>
        </section>

        {errorMsg && (
          <div className="mt-5 rounded-2xl border border-[#b4141e]/35 bg-[#b4141e]/10 p-4 text-sm text-[#f1c3c7]">
            {errorMsg}
          </div>
        )}

        {suggested.length > 0 && (
          <section className="mt-5 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-5">
            <p className="text-[11px] uppercase tracking-[0.34em] text-[#e87a82]">
              People You May Know
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {suggested.slice(0, 4).map((member) => {
                const profileHref = profileHrefFromHandle(member.handle);

                const cardContent = (
                  <>
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[#b4141e]/35 bg-[#b4141e]">
                      {member.photo ? (
                        <Image
                          src={member.photo}
                          alt={member.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                          unoptimized={member.photo.includes("supabase")}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-serif italic text-white">
                          {member.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{member.name}</p>
                      <p className="mt-1 truncate text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                        {member.suggestionReason}
                      </p>
                    </div>
                  </>
                );

                if (!profileHref) {
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setOpenId(member.id)}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3 text-left transition hover:border-[#b4141e]/40"
                    >
                      {cardContent}
                    </button>
                  );
                }

                return (
                  <Link
                    key={member.id}
                    href={profileHref}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3 text-left transition hover:border-[#b4141e]/40"
                  >
                    {cardContent}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <ul className="mt-5 space-y-4">
          {loading &&
            Array.from({ length: 4 }).map((_, index) => (
              <li key={index} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex animate-pulse items-center gap-3">
                  <div className="h-14 w-14 shrink-0 rounded-full bg-white/10" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-5 w-36 rounded-full bg-white/10" />
                    <div className="h-3 w-48 max-w-full rounded-full bg-white/10" />
                    <div className="h-3 w-32 rounded-full bg-white/10" />
                  </div>
                </div>
              </li>
            ))}

          {!loading &&
            filtered.map((m, index) => {
              const status = statuses[m.id] ?? "none";
              const profileHref = profileHrefFromHandle(m.handle);

              const avatarContent = (
                <>
                  {m.photo ? (
                    <Image
                      src={m.photo}
                      alt={m.name}
                      fill
                      sizes="64px"
                      priority={index < 3}
                      className="object-cover"
                      unoptimized={m.photo.includes("supabase")}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-serif text-xl italic text-white">
                      {m.name.charAt(0)}
                    </div>
                  )}
                </>
              );

              const textContent = (
                <>
                  <h3 className="truncate font-serif text-2xl leading-tight text-white">{m.name}</h3>

                  <p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.08em] text-zinc-500">
                    {m.handle}
                  </p>

                  <p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.06em] text-zinc-500">
                    {m.city}
                  </p>

                  <p className="mt-1 truncate text-sm text-zinc-400">{m.bike}</p>

                  {m.mutualCount > 0 && (
                    <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#e87a82]">
                      {m.mutualCount} mutual
                    </p>
                  )}
                </>
              );

              return (
                <li
                  key={m.id}
                  className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-4 transition hover:border-white/20"
                >
                  <div className="flex items-center gap-3">
                    {profileHref ? (
                      <Link
                        href={profileHref}
                        prefetch
                        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[#b4141e]/50 bg-[#b4141e] shadow-[0_0_20px_-8px_rgba(180,20,30,0.65)] transition hover:scale-105 sm:h-16 sm:w-16"
                      >
                        {avatarContent}
                      </Link>
                    ) : (
                      <button
                        onClick={() => setOpenId(m.id)}
                        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[#b4141e]/50 bg-[#b4141e] shadow-[0_0_20px_-8px_rgba(180,20,30,0.65)] transition hover:scale-105 sm:h-16 sm:w-16"
                      >
                        {avatarContent}
                      </button>
                    )}

                    {profileHref ? (
                      <Link href={profileHref} prefetch className="min-w-0 flex-1 text-left">
                        {textContent}
                      </Link>
                    ) : (
                      <button onClick={() => setOpenId(m.id)} className="min-w-0 flex-1 text-left">
                        {textContent}
                      </button>
                    )}

                    <button
                      onClick={() =>
                        status === "pending" ? handleCancelRequest(m.id) : handleConnect(m.id)
                      }
                      disabled={status === "connected"}
                      className={`shrink-0 rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.1em] transition sm:px-4 ${
                        status === "connected"
                          ? "cursor-default border-[#b4141e]/40 bg-[#b4141e]/10 text-[#e87a82]"
                          : status === "pending"
                            ? "border-white/20 text-zinc-300 hover:border-[#b4141e]/60 hover:text-[#e87a82]"
                            : status === "requested"
                              ? "border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82] hover:bg-[#b4141e]/30"
                              : "border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82] hover:bg-[#b4141e]/30"
                      }`}
                    >
                      {status === "connected"
                        ? "Connected"
                        : status === "pending"
                          ? "Pending"
                          : status === "requested"
                            ? "Accept"
                            : "Connect"}
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {m.style.map((s) => (
                      <span
                        key={s}
                        className="max-w-full truncate rounded-full border border-white/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.08em] text-zinc-500"
                      >
                        {s}
                      </span>
                    ))}

                    <span className="max-w-full truncate rounded-full border border-white/5 px-2.5 py-1 text-[9px] uppercase tracking-[0.08em] text-zinc-600 sm:ml-auto">
                      {m.suggestionReason}
                    </span>
                  </div>
                </li>
              );
            })}

          {!loading && filtered.length === 0 && (
            <li className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
              <p className="text-base text-zinc-500">No riders match. Try a different filter.</p>
            </li>
          )}
        </ul>

        <footer className="mt-16 text-center">
          <div className="mx-auto h-px w-12 bg-white/10" />
          <p className="mt-5 text-xs uppercase tracking-[0.5em] text-zinc-600">
            © Crimson Society · MMXXVI
          </p>
        </footer>
      </div>

      {openMember && (
        <div
          onClick={() => setOpenId(null)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-t-3xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#050505] p-8 sm:rounded-3xl"
          >
            <button
              onClick={() => setOpenId(null)}
              className="absolute right-5 top-5 text-2xl text-zinc-500 transition hover:text-white"
            >
              ×
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="relative h-28 w-28 overflow-hidden rounded-full border border-[#b4141e]/60 bg-[#b4141e] shadow-[0_0_32px_-4px_rgba(180,20,30,0.7)]">
                {openMember.photo ? (
                  <Image
                    src={openMember.photo}
                    alt={openMember.name}
                    fill
                    sizes="112px"
                    className="object-cover"
                    unoptimized={openMember.photo.includes("supabase")}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-serif text-3xl italic text-white">
                    {openMember.name.charAt(0)}
                  </div>
                )}
              </div>

              <h2 className="mt-6 font-serif text-5xl">{openMember.name}</h2>

              <p className="mt-2 text-sm uppercase tracking-[0.3em] text-zinc-500">
                {openMember.handle} · {openMember.city}
              </p>

              <div className="mt-5 flex items-center gap-4">
                <span className="h-px w-10 bg-white/20" />
                <span className="text-[#b4141e]">✦</span>
                <span className="h-px w-10 bg-white/20" />
              </div>

              <p className="mt-5 font-serif text-xl italic text-zinc-300">
                &quot;{openMember.bio}&quot;
              </p>

              <p className="mt-3 text-[11px] uppercase tracking-[0.25em] text-[#e87a82]">
                {openMember.suggestionReason}
              </p>

              <div className="mt-7 grid w-full grid-cols-2 gap-3 text-left">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Machine</p>
                  <p className="mt-1.5 text-base text-zinc-200">{openMember.bike}</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Mutuals</p>
                  <p className="mt-1.5 text-base text-zinc-200">{openMember.mutualCount}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {openMember.style.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-zinc-400"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-8 grid w-full gap-3">
                <button
                  onClick={() =>
                    statuses[openMember.id] === "pending"
                      ? handleCancelRequest(openMember.id)
                      : handleConnect(openMember.id)
                  }
                  disabled={statuses[openMember.id] === "connected"}
                  className="w-full rounded-full border border-[#b4141e] bg-[#b4141e]/20 py-3.5 text-center text-sm uppercase tracking-[0.3em] text-[#e87a82] transition hover:bg-[#b4141e]/30 disabled:cursor-default disabled:opacity-70"
                >
                  {statuses[openMember.id] === "connected"
                    ? "Connected"
                    : statuses[openMember.id] === "pending"
                      ? "Pending"
                      : statuses[openMember.id] === "requested"
                        ? "Accept"
                        : "Connect"}
                </button>

                {profileHrefFromHandle(openMember.handle) && (
                  <Link
                    href={profileHrefFromHandle(openMember.handle)!}
                    className="w-full rounded-full border border-white/10 py-3.5 text-center text-sm uppercase tracking-[0.3em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]"
                  >
                    View Profile
                  </Link>
                )}

                {statuses[openMember.id] === "connected" && (
                  <Link
                    href={`/inbox?peer=${openMember.id}`}
                    className="w-full rounded-full border border-white/10 py-3.5 text-center text-sm uppercase tracking-[0.3em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]"
                  >
                    Message
                  </Link>
                )}
              </div>

              <button
                onClick={() => setOpenId(null)}
                className="mt-3 w-full rounded-full border border-white/10 py-3.5 text-sm uppercase tracking-[0.3em] text-zinc-400 transition hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
