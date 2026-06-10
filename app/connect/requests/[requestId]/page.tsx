"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { BOTTOM_NAV_CLEARANCE, CS_AVATAR_FALLBACK, CS_AVATAR_RING, CS_FOCUS_RING } from "@/lib/crimson-accent";
import { requireCompleteProfile } from "@/lib/requireCompleteProfile";
import { supabase } from "@/lib/supabase";

type ConnectionRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  accepted_at: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  profile_image_url: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  riding_area: string | null;
  bike_type: string | null;
  riding_style: string | null;
};

function displayName(profile: ProfileRow | null) {
  return profile?.display_name || profile?.full_name || profile?.username || "Crimson Rider";
}

function handleFor(profile: ProfileRow | null) {
  return profile?.username ? `@${profile.username}` : "@member";
}

function avatarFor(profile: ProfileRow | null) {
  return profile?.profile_image_url || profile?.avatar_url || null;
}

function locationFor(profile: ProfileRow | null) {
  if (!profile) return "Riding area pending";
  if (profile.city && profile.state) return `${profile.city}, ${profile.state}`;
  if (profile.city) return profile.city;
  return profile.riding_area || "Riding area pending";
}

export default function ConnectionRequestReviewPage() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();
  const requestId = params.requestId;
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user?.id ?? null;

  const [connection, setConnection] = useState<ConnectionRow | null>(null);
  const [requester, setRequester] = useState<ProfileRow | null>(null);
  const [addressee, setAddressee] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const loadRequest = useCallback(async () => {
    if (!userId || !requestId) return;

    setLoading(true);
    setErrorMsg(null);
    setNotFound(false);

    const { data: connectionRow, error: connectionError } = await supabase
      .from("user_connections")
      .select("id, requester_id, addressee_id, status, created_at, accepted_at")
      .eq("id", requestId)
      .maybeSingle();

    if (connectionError) {
      setErrorMsg("Could not load this connection request.");
      setLoading(false);
      return;
    }

    if (!connectionRow) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const row = connectionRow as ConnectionRow;
    if (row.requester_id !== userId && row.addressee_id !== userId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const profileIds = [row.requester_id, row.addressee_id];
    const { data: profiles, error: profilesError } = await supabase
      .from("public_profiles")
      .select(
        "id, username, display_name, full_name, profile_image_url, avatar_url, bio, city, state, riding_area, bike_type, riding_style",
      )
      .in("id", profileIds);

    if (profilesError) {
      setErrorMsg("Could not load profile details for this request.");
      setLoading(false);
      return;
    }

    const profileMap = Object.fromEntries(
      ((profiles || []) as ProfileRow[]).map((profile) => [profile.id, profile]),
    );

    setConnection(row);
    setRequester(profileMap[row.requester_id] ?? null);
    setAddressee(profileMap[row.addressee_id] ?? null);
    setLoading(false);
  }, [requestId, userId]);

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      router.replace(`/login?next=${encodeURIComponent(`/connect/requests/${requestId}`)}`);
      return;
    }

    let active = true;

    void (async () => {
      try {
        const complete = await requireCompleteProfile(userId);
        if (!active) return;
        if (!complete) {
          router.replace("/profile/setup");
          return;
        }
        await loadRequest();
      } catch {
        if (active) router.replace("/profile/setup");
      }
    })();

    return () => {
      active = false;
    };
  }, [authLoading, loadRequest, requestId, router, userId]);

  const isIncoming = Boolean(connection && userId && connection.addressee_id === userId);
  const isOutgoing = Boolean(connection && userId && connection.requester_id === userId);
  const subjectProfile = isIncoming ? requester : isOutgoing ? addressee : requester;
  const subjectHref = subjectProfile?.username
    ? `/profile/${encodeURIComponent(subjectProfile.username)}`
    : null;

  async function handleApprove() {
    if (!connection || !userId || !isIncoming || connection.status !== "pending") return;

    setActionPending(true);
    setErrorMsg(null);

    const { error } = await supabase
      .from("user_connections")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", connection.id)
      .eq("addressee_id", userId)
      .eq("status", "pending");

    if (error) {
      setErrorMsg(error.message || "Could not approve this request.");
      setActionPending(false);
      return;
    }

    await loadRequest();
    setActionPending(false);
  }

  async function handleDecline() {
    if (!connection || !userId || !isIncoming || connection.status !== "pending") return;

    setActionPending(true);
    setErrorMsg(null);

    const { error } = await supabase
      .from("user_connections")
      .update({ status: "declined" })
      .eq("id", connection.id)
      .eq("addressee_id", userId)
      .eq("status", "pending");

    if (error) {
      setErrorMsg(error.message || "Could not remove this request.");
      setActionPending(false);
      return;
    }

    await loadRequest();
    setActionPending(false);
  }

  async function handleCancel() {
    if (!connection || !userId || !isOutgoing || connection.status !== "pending") return;

    setActionPending(true);
    setErrorMsg(null);

    const { error } = await supabase
      .from("user_connections")
      .delete()
      .eq("id", connection.id)
      .eq("requester_id", userId)
      .eq("status", "pending");

    if (error) {
      setErrorMsg(error.message || "Could not cancel this request.");
      setActionPending(false);
      return;
    }

    router.replace("/connect");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050405] text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 48% at 50% 0%, rgba(104,0,11,0.44), transparent 58%), linear-gradient(180deg, rgba(127,17,27,0.06) 0%, rgba(0,0,0,0) 32%)",
        }}
      />

      <div
        className={`relative mx-auto max-w-2xl px-6 pt-[calc(env(safe-area-inset-top)+3rem)] ${BOTTOM_NAV_CLEARANCE}`}
      >
        <Link
          href="/connect"
          className="text-sm uppercase tracking-[0.3em] text-zinc-500 transition hover:text-[#e87a82]"
        >
          ← Connect
        </Link>

        <header className="mt-8">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Connection request</p>
          <h1 className="mt-2 font-serif text-4xl text-white">Review request</h1>
        </header>

        {loading ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-zinc-500">
            Loading request...
          </div>
        ) : notFound ? (
          <div className="mt-10 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-6">
            <p className="text-sm text-amber-100">This connection request is no longer available.</p>
            <Link
              href="/connect"
              className={`mt-4 inline-flex rounded-full border border-[#b4141e] bg-[#b4141e]/20 px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-[#e87a82] ${CS_FOCUS_RING}`}
            >
              Back to Connect
            </Link>
          </div>
        ) : connection && subjectProfile ? (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className={`relative h-20 w-20 shrink-0 ${CS_AVATAR_RING}`}>
                {avatarFor(subjectProfile) ? (
                  <Image
                    src={avatarFor(subjectProfile)!}
                    alt={displayName(subjectProfile)}
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized={avatarFor(subjectProfile)!.includes("supabase")}
                  />
                ) : (
                  <div className={`${CS_AVATAR_FALLBACK} text-2xl`}>
                    {displayName(subjectProfile).charAt(0)}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-serif text-2xl text-white">{displayName(subjectProfile)}</p>
                <p className="text-sm text-zinc-400">{handleFor(subjectProfile)}</p>
                <p className="mt-2 text-sm text-zinc-500">{locationFor(subjectProfile)}</p>
                {subjectProfile.bio ? (
                  <p className="mt-3 text-sm leading-6 text-zinc-300">{subjectProfile.bio}</p>
                ) : null}
                {subjectProfile.riding_style || subjectProfile.bike_type ? (
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
                    {[subjectProfile.riding_style, subjectProfile.bike_type].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </div>
            </div>

            {subjectHref ? (
              <Link
                href={subjectHref}
                className="mt-5 inline-flex text-sm text-[#e87a82] underline-offset-4 hover:underline"
              >
                View public profile
              </Link>
            ) : null}

            {errorMsg ? (
              <p className="mt-5 rounded-xl border border-[#b4141e]/35 bg-[#b4141e]/10 px-4 py-3 text-sm text-[#f1c3c7]">
                {errorMsg}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              {connection.status === "pending" && isIncoming ? (
                <>
                  <button
                    type="button"
                    disabled={actionPending}
                    onClick={() => void handleApprove()}
                    className={`rounded-full border border-[#b4141e] bg-[#b4141e] px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-white transition hover:bg-[#c91824] disabled:opacity-60 ${CS_FOCUS_RING}`}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={actionPending}
                    onClick={() => void handleDecline()}
                    className={`rounded-full border border-white/15 bg-white/[0.03] px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/30 disabled:opacity-60 ${CS_FOCUS_RING}`}
                  >
                    Remove
                  </button>
                </>
              ) : null}

              {connection.status === "pending" && isOutgoing ? (
                <button
                  type="button"
                  disabled={actionPending}
                  onClick={() => void handleCancel()}
                  className={`rounded-full border border-white/15 bg-white/[0.03] px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/30 disabled:opacity-60 ${CS_FOCUS_RING}`}
                >
                  Cancel request
                </button>
              ) : null}

              {connection.status === "accepted" ? (
                <p className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
                  Connection accepted
                  {connection.accepted_at
                    ? ` · ${new Date(connection.accepted_at).toLocaleDateString()}`
                    : ""}
                </p>
              ) : null}

              {connection.status === "declined" ? (
                <p className="rounded-full border border-zinc-500/30 bg-zinc-500/10 px-4 py-2 text-sm text-zinc-300">
                  Request declined
                </p>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
