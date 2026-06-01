"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireCompleteProfile } from "@/lib/requireCompleteProfile";
import { useAuth } from "@/components/AuthProvider";
import { getBestImageUrl, getVideoPlaybackUrl } from "@/lib/media";
import { CrimsonSoundAttribution } from "@/components/CrimsonSoundPicker";
import type { CrimsonSound } from "@/lib/sounds";

type PostType = "photo" | "reel" | "status";

type FeedPost = {
  id: string;
  userId?: string;
  type: PostType;
  author: { name: string; handle: string; photo: string | null };
  location?: string;
  caption?: string;
  photos?: string[];
  video?: string | null;
  sound?: CrimsonSound | null;
  statusText?: string;
  statusBg?: string;
  mediaStatus?: string;
  taggedRiders?: string[];
  timeLabel: string;
  likes: number;
  comments: number;
};

type RawProfile = {
  id?: string;
  username?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  profile_image_url?: string | null;
} | null;

type RawPost = {
  id: string;
  user_id: string;
  post_type?: string | null;
  caption?: string | null;
  image_url?: string | null;
  image_display_url?: string | null;
  image_thumbnail_url?: string | null;
  video_url?: string | null;
  video_playback_url?: string | null;
  video_hls_url?: string | null;
  video_thumbnail_url?: string | null;
  media_status?: string | null;
  status_text?: string | null;
  status_bg?: string | null;
  location?: string | null;
  created_at: string;
  profiles?: RawProfile | RawProfile[];
  post_likes?: { count: number }[];
  post_comments?: { count: number }[];
  post_sounds?: {
    id: string;
    sounds: CrimsonSound | CrimsonSound[] | null;
  }[];
};

type RoutePoint = {
  lat: number;
  lng: number;
};

type RideWaypoint = RoutePoint & {
  id: string;
  label: string;
};

type DashboardRideRow = {
  id: string;
  host_id: string;
  name: string;
  date: string | null;
  time: string | null;
  meet_point: string | null;
  city: string | null;
  cover: string | null;
  route: unknown;
  waypoints: unknown;
  tracking_status: string | null;
  started_at: string | null;
};

type DashboardAttendeeRow = {
  ride_id: string;
};

type DashboardLiveLocationRow = {
  ride_id: string;
  user_id: string;
  lat: number;
  lng: number;
  updated_at: string;
};

type DashboardProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  profile_image_url: string | null;
  avatar_url: string | null;
};

type DashboardMeet = {
  id: string;
  name: string;
  date: string;
  time: string;
  meetPoint: string;
  city: string;
  cover: string | null;
  riderCount: number;
  trackingStatus: string | null;
  route: RoutePoint[];
  waypoints: RideWaypoint[];
  hostId: string;
  startedAt: string | null;
};

type DashboardLiveRider = {
  userId: string;
  name: string;
  username: string | null;
  photo: string | null;
  lat: number;
  lng: number;
};

type LiveMapPreview = {
  ride: DashboardMeet | null;
  activeRiderCount: number;
  activeMeetCount: number;
  lastUpdatedAt: string | null;
  riders: DashboardLiveRider[];
};

const emptyLiveMapPreview: LiveMapPreview = {
  ride: null,
  activeRiderCount: 0,
  activeMeetCount: 0,
  lastUpdatedAt: null,
  riders: [],
};

const previewMarkerPositions = [
  { left: "18%", top: "34%" },
  { left: "78%", top: "28%" },
  { left: "42%", top: "56%" },
  { left: "86%", top: "76%" },
  { left: "26%", top: "80%" },
];

const statusBgMap: Record<string, string> = {
  noir: "bg-gradient-to-br from-[#050505] via-[#0c0c0d] to-[#050505]",
  crimson: "bg-gradient-to-br from-[#3a0709] via-[#b4141e] to-[#3a0709]",
  carbon: "bg-gradient-to-br from-[#1a1a1c] via-[#2a2a2e] to-[#0a0a0c]",
  ember: "bg-gradient-to-br from-[#1a0405] via-[#6a0d14] to-[#0a0102]",
};

const seedPosts: FeedPost[] = [
  {
    id: "seed-1",
    type: "photo",
    author: {
      name: "Marco Vélez",
      handle: "@nightrider",
      photo: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200",
    },
    location: "Hill Country · TX",
    caption: "Dawn patrol through the canyons. The bike sounded like a prayer.",
    photos: ["https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200"],
    timeLabel: "2h",
    likes: 248,
    comments: 31,
  },
  {
    id: "seed-2",
    type: "reel",
    author: {
      name: "Elena Ruiz",
      handle: "@ironsaint",
      photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
    },
    location: "Mulholland · LA",
    caption: "Sunset run. No words.",
    video: null,
    photos: ["https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200"],
    timeLabel: "5h",
    likes: 612,
    comments: 84,
  },
  {
    id: "seed-3",
    type: "status",
    author: {
      name: "Devin Cole",
      handle: "@blackmass",
      photo: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200",
    },
    statusText: "Two wheels, one road, no apologies.",
    statusBg: "crimson",
    timeLabel: "9h",
    likes: 184,
    comments: 22,
  },
  {
    id: "seed-4",
    type: "photo",
    author: {
      name: "Aiyana Cross",
      handle: "@savagegrace",
      photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
    },
    location: "Red Rocks · CO",
    caption: "Cold morning, warm exhaust.",
    photos: ["https://images.unsplash.com/photo-1547549082-6bc09f2049ae?w=1200"],
    timeLabel: "1d",
    likes: 421,
    comments: 47,
  },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function pickProfile(profileInput: RawProfile | RawProfile[] | undefined) {
  if (Array.isArray(profileInput)) return profileInput[0] ?? null;
  return profileInput ?? null;
}

function pickSound(postSounds: RawPost["post_sounds"]) {
  const sound = postSounds?.[0]?.sounds;
  if (Array.isArray(sound)) return sound[0] ?? null;
  return sound ?? null;
}

function isRoutePoint(value: unknown): value is RoutePoint {
  return (
    typeof value === "object" &&
    value !== null &&
    "lat" in value &&
    "lng" in value &&
    typeof (value as RoutePoint).lat === "number" &&
    typeof (value as RoutePoint).lng === "number" &&
    Number.isFinite((value as RoutePoint).lat) &&
    Number.isFinite((value as RoutePoint).lng)
  );
}

function parseRoute(value: unknown) {
  if (!Array.isArray(value)) return [];
  const route = value.filter(isRoutePoint);
  return route.length > 1 ? route : [];
}

function parseWaypoints(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is RideWaypoint => {
    return (
      isRoutePoint(item) &&
      "id" in item &&
      "label" in item &&
      typeof item.id === "string" &&
      typeof item.label === "string"
    );
  });
}

function getRideDateTime(ride: Pick<DashboardMeet, "date" | "time">) {
  const date = ride.date?.trim();
  if (!date) return null;

  const time = ride.time?.trim();
  const safeTime = time && time.includes(":") ? time : "23:59";
  const parsed = new Date(`${date}T${safeTime}`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMeetTime(date: string, time: string) {
  const parsed = getRideDateTime({ date, time });
  if (!parsed) return `${date || "Date TBD"} / ${time || "Time TBD"}`;

  return parsed.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLiveUpdated(value: string | null) {
  if (!value) return "No live signal";

  const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (diffSeconds < 60) return "Updated just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`;
  return "Updated over 1h ago";
}

function getPreviewMarkerStyle(
  rider: Pick<DashboardLiveRider, "lat" | "lng">,
  riders: DashboardLiveRider[],
  index: number,
) {
  const fallback = previewMarkerPositions[index % previewMarkerPositions.length];
  const lats = riders.map((item) => item.lat).filter(Number.isFinite);
  const lngs = riders.map((item) => item.lng).filter(Number.isFinite);

  if (lats.length < 2 || lngs.length < 2) {
    return { ...fallback, transform: "translate(-50%, -50%)" };
  }

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;

  if (latSpan < 0.0001 || lngSpan < 0.0001) {
    return { ...fallback, transform: "translate(-50%, -50%)" };
  }

  const left = 18 + ((rider.lng - minLng) / lngSpan) * 64;
  const top = 26 + (1 - (rider.lat - minLat) / latSpan) * 48;

  return {
    left: `${Math.max(12, Math.min(88, left))}%`,
    top: `${Math.max(22, Math.min(82, top))}%`,
    transform: "translate(-50%, -50%)",
  };
}

function mapRideToDashboardMeet(
  ride: DashboardRideRow,
  attendeeCounts: Map<string, number>,
): DashboardMeet {
  return {
    id: ride.id,
    name: ride.name || "Untitled Meet",
    date: ride.date || "",
    time: ride.time || "",
    meetPoint: ride.meet_point || "Meet point pending",
    city: ride.city || ride.meet_point || "Location pending",
    cover: ride.cover || null,
    riderCount: attendeeCounts.get(ride.id) || 0,
    trackingStatus: ride.tracking_status,
    route: parseRoute(ride.route),
    waypoints: parseWaypoints(ride.waypoints),
    hostId: ride.host_id,
    startedAt: ride.started_at,
  };
}

function mapPostToFeed(post: RawPost): FeedPost {
  const profile = pickProfile(post.profiles);
  const sound = pickSound(post.post_sounds);
  const imageUrl = getBestImageUrl(
    post.image_display_url || post.video_thumbnail_url,
    post.image_url,
    "feed",
  );

  const name = profile?.display_name || profile?.full_name || "Unknown Rider";
  const handle = profile?.username ? `@${profile.username}` : "@unknown";
  const photo = profile?.profile_image_url || profile?.avatar_url || null;

  return {
    id: post.id,
    userId: post.user_id,
    type: (post.post_type || "photo") as PostType,
    author: {
      name,
      handle,
      photo,
    },
    location: post.location || "",
    caption: post.caption || "",
    photos: imageUrl ? [imageUrl] : [],
    video: getVideoPlaybackUrl(
      post.video_playback_url || post.video_url,
      post.video_hls_url,
    ),
    sound,
    statusText: post.status_text || "",
    statusBg: post.status_bg || "noir",
    mediaStatus: post.media_status || "ready",
    taggedRiders: [],
    timeLabel: timeAgo(post.created_at),
    likes: post.post_likes?.[0]?.count || 0,
    comments: post.post_comments?.[0]?.count || 0,
  };
}

const PULL_THRESHOLD = 70;
const MAX_PULL = 120;

function getProfileHref(handle: string) {
  const username = handle.replace(/^@+/, "").trim();
  if (!username || username === "unknown") return null;
  return `/profile/${username}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { session, loading, isAdmin } = useAuth();

  const [posts, setPosts] = useState<FeedPost[]>(seedPosts);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [popId, setPopId] = useState<string | null>(null);
  const [commentSheet, setCommentSheet] = useState<string | null>(null);
  const [shareSheet, setShareSheet] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [feedLoading, setFeedLoading] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardMeets, setDashboardMeets] = useState<DashboardMeet[]>([]);
  const [liveMapPreview, setLiveMapPreview] = useState<LiveMapPreview>(emptyLiveMapPreview);

  const carouselRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pullStartY = useRef<number | null>(null);
  const isPulling = useRef(false);
  const mouseStartY = useRef<number | null>(null);
  const isMouseDown = useRef(false);

  useEffect(() => {
  if (loading) return;

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
}, [loading, session, router]);

  const loadFeed = useCallback(async () => {
    if (!session) return;

    setFeedLoading(true);
    const { data, error } = await supabase
      .from("Posts")
      .select(`
        id,
        user_id,
        post_type,
        caption,
        image_url,
        image_display_url,
        image_thumbnail_url,
        video_url,
        video_playback_url,
        video_hls_url,
        video_thumbnail_url,
        media_status,
        status_text,
        status_bg,
        location,
        created_at,
        profiles (
          id,
          username,
          display_name,
          full_name,
          avatar_url,
          profile_image_url
        ),
        post_likes(count),
        post_comments(count),
        post_sounds (
          id,
          sounds (
            id,
            title,
            artist,
            duration_seconds,
            mood,
            bpm,
            cover_image_url,
            audio_url,
            preview_url,
            license_type,
            rights_owner,
            source_url,
            approved,
            featured,
            usage_count,
            category_id,
            created_at
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setToast(error.message || "Could not load posts.");
      setTimeout(() => setToast(null), 1800);
      setFeedLoading(false);
      return;
    }

    const livePosts = ((data || []) as RawPost[]).map(mapPostToFeed);
const nextPosts = livePosts.length > 0 ? [...livePosts, ...seedPosts] : seedPosts;

setPosts(nextPosts);

const livePostIds = livePosts.map((post) => post.id);

if (livePostIds.length > 0) {
  const { data: userLikes, error: likesError } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("user_id", session.user.id)
    .in("post_id", livePostIds);

  if (!likesError) {
    const likedMap: Record<string, boolean> = {};

    for (const like of userLikes || []) {
      likedMap[String(like.post_id)] = true;
    }

    setLiked(likedMap);
  }
}

setFeedLoading(false);
  }, [session]);

  const loadDashboardSections = useCallback(async () => {
    if (!session) return;

    setDashboardLoading(true);

    const { data: rideData, error: ridesError } = await supabase
      .from("rides")
      .select("id, host_id, name, date, time, meet_point, city, cover, route, waypoints, tracking_status, started_at")
      .eq("status", "active")
      .order("date", { ascending: true })
      .order("time", { ascending: true })
      .limit(8);

    if (ridesError) {
      console.error("Failed to load dashboard meets:", ridesError);
      setDashboardMeets([]);
      setLiveMapPreview(emptyLiveMapPreview);
      setDashboardLoading(false);
      return;
    }

    const rows = (rideData || []) as DashboardRideRow[];
    const rideIds = rows.map((ride) => ride.id);

    if (rideIds.length === 0) {
      setDashboardMeets([]);
      setLiveMapPreview(emptyLiveMapPreview);
      setDashboardLoading(false);
      return;
    }

    const [{ data: attendeeRows, error: attendeesError }, { data: liveRows, error: liveError }] =
      await Promise.all([
        supabase.from("ride_attendees").select("ride_id").in("ride_id", rideIds),
        supabase
          .from("ride_live_locations")
          .select("ride_id, user_id, lat, lng, updated_at")
          .in("ride_id", rideIds)
          .eq("sharing_enabled", true)
          .gte("updated_at", new Date(Date.now() - 30 * 60 * 1000).toISOString()),
      ]);

    if (attendeesError) {
      console.error("Failed to load dashboard meet attendees:", attendeesError);
    }

    if (liveError) {
      console.error("Failed to load dashboard live riders:", liveError);
    }

    const attendeeCounts = new Map<string, number>();
    for (const row of (attendeeRows || []) as DashboardAttendeeRow[]) {
      attendeeCounts.set(row.ride_id, (attendeeCounts.get(row.ride_id) || 0) + 1);
    }

    const nextMeets = rows
      .map((ride) => mapRideToDashboardMeet(ride, attendeeCounts))
      .filter((ride) => {
        const dateTime = getRideDateTime(ride);
        return !dateTime || dateTime.getTime() >= Date.now();
      })
      .slice(0, 4);

    const liveLocations = (liveRows || []) as DashboardLiveLocationRow[];
    const liveCounts = new Map<string, number>();
    const liveUserIds = Array.from(new Set(liveLocations.map((row) => row.user_id)));
    let lastUpdatedAt: string | null = null;

    for (const row of liveLocations) {
      liveCounts.set(row.ride_id, (liveCounts.get(row.ride_id) || 0) + 1);
      if (!lastUpdatedAt || row.updated_at > lastUpdatedAt) lastUpdatedAt = row.updated_at;
    }

    const { data: liveProfiles, error: liveProfilesError } = liveUserIds.length
      ? await supabase
          .from("profiles")
          .select("id, username, display_name, full_name, profile_image_url, avatar_url")
          .in("id", liveUserIds)
      : { data: [], error: null };

    if (liveProfilesError) {
      console.error("Failed to load dashboard live rider profiles:", liveProfilesError);
    }

    const liveProfileMap = new Map(
      ((liveProfiles || []) as DashboardProfileRow[]).map((profile) => [profile.id, profile])
    );

    const previewRiders = liveLocations.slice(0, 5).map((location) => {
      const profile = liveProfileMap.get(location.user_id);
      return {
        userId: location.user_id,
        name:
          profile?.display_name?.trim() ||
          profile?.full_name?.trim() ||
          profile?.username?.trim() ||
          "Rider",
        username: profile?.username || null,
        photo: profile?.profile_image_url || profile?.avatar_url || null,
        lat: location.lat,
        lng: location.lng,
      };
    });

    const liveRide =
      nextMeets.find((ride) => ride.trackingStatus === "active" && (liveCounts.get(ride.id) || 0) > 0) ||
      nextMeets.find((ride) => ride.trackingStatus === "active") ||
      null;

    setDashboardMeets(nextMeets);
    setLiveMapPreview({
      ride: liveRide,
      activeRiderCount: liveLocations.length,
      activeMeetCount: Array.from(liveCounts.values()).filter((count) => count > 0).length,
      lastUpdatedAt,
      riders: previewRiders,
    });
    setDashboardLoading(false);
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const timer = window.setTimeout(() => {
      void loadFeed();
    }, 0);

    const onFocus = () => {
      void loadFeed();
    };

    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadFeed, session]);

  useEffect(() => {
    if (!session) return;

    const timer = window.setTimeout(() => {
      void loadDashboardSections();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDashboardSections, session]);

  const doRefresh = () => {
    if (refreshing) return;

    setRefreshing(true);

    setTimeout(() => {
      void loadFeed();
      setRefreshing(false);
      setPullY(0);
      setToast("Feed refreshed.");
      setTimeout(() => setToast(null), 1600);
    }, 700);
  };

  const deletePost = async (post: FeedPost) => {
    const currentUserId = session?.user?.id;
    const canDelete = Boolean(post.userId && currentUserId && (post.userId === currentUserId || isAdmin));

    if (!canDelete || deletingPostId) return;

    const confirmed = window.confirm("Delete this post? This cannot be undone.");
    if (!confirmed) return;

    setDeletingPostId(post.id);
    setOpenMenuId(null);

    let query = supabase.from("Posts").delete().eq("id", post.id);

    if (!isAdmin) {
      query = query.eq("user_id", currentUserId);
    }

    const { error } = await query;

    if (error) {
      setToast(error.message || "Could not delete post.");
      setTimeout(() => setToast(null), 1800);
      setDeletingPostId(null);
      return;
    }

    setPosts((prev) => prev.filter((item) => item.id !== post.id));
    setLiked((prev) => {
      const next = { ...prev };
      delete next[post.id];
      return next;
    });
    setLikeCounts((prev) => {
      const next = { ...prev };
      delete next[post.id];
      return next;
    });
    setBookmarked((prev) => {
      const next = { ...prev };
      delete next[post.id];
      return next;
    });

    setDeletingPostId(null);
    setToast("Post deleted.");
    setTimeout(() => setToast(null), 1400);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY > 4 || refreshing) return;
    pullStartY.current = e.touches[0].clientY;
    isPulling.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current || pullStartY.current === null || refreshing) return;

    const delta = e.touches[0].clientY - pullStartY.current;

    if (delta > 0 && window.scrollY <= 4) {
      const damped = Math.min(MAX_PULL, delta * 0.5);
      setPullY(damped);
    } else {
      setPullY(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isPulling.current) return;

    isPulling.current = false;
    pullStartY.current = null;

    if (pullY >= PULL_THRESHOLD) {
      doRefresh();
    } else {
      setPullY(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (window.scrollY > 4 || refreshing) return;
    mouseStartY.current = e.clientY;
    isMouseDown.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown.current || mouseStartY.current === null || refreshing) return;

    const delta = e.clientY - mouseStartY.current;

    if (delta > 0 && window.scrollY <= 4) {
      const damped = Math.min(MAX_PULL, delta * 0.5);
      setPullY(damped);
    } else {
      setPullY(0);
    }
  };

  const handleMouseUp = () => {
    if (!isMouseDown.current) return;

    isMouseDown.current = false;
    mouseStartY.current = null;

    if (pullY >= PULL_THRESHOLD) {
      doRefresh();
    } else {
      setPullY(0);
    }
  };

  const toggleLike = async (id: string) => {
  const userId = session?.user?.id;
  if (!userId) return;

  const wasLiked = liked[id];

  setLiked((prev) => ({ ...prev, [id]: !wasLiked }));
  setLikeCounts((prev) => ({
    ...prev,
    [id]:
      (prev[id] ?? posts.find((p) => p.id === id)?.likes ?? 0) +
      (wasLiked ? -1 : 1),
  }));

  const { error } = wasLiked
    ? await supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", userId)
    : await supabase.from("post_likes").insert({ post_id: id, user_id: userId });

  if (error) {
    setLiked((prev) => ({ ...prev, [id]: wasLiked }));
    setLikeCounts((prev) => ({
      ...prev,
      [id]:
        (prev[id] ?? posts.find((p) => p.id === id)?.likes ?? 0) +
        (wasLiked ? 1 : -1),
    }));
    setToast(error.message || "Could not update like.");
    setTimeout(() => setToast(null), 1600);
    return;
  }

  if (!wasLiked) {
    setPopId(id);
    setTimeout(() => setPopId(null), 400);
  }
};

  const toggleBookmark = (id: string) => {
    setBookmarked((prev) => ({ ...prev, [id]: !prev[id] }));
    setToast(bookmarked[id] ? "Removed from saved." : "Saved to your dossier.");
    setTimeout(() => setToast(null), 1400);
  };

  const sendComment = async () => {
  const userId = session?.user?.id;
  const postId = commentSheet;
  const body = commentDraft.trim();

  if (!userId || !postId || !body) return;

  const { error } = await supabase.from("post_comments").insert({
    post_id: postId,
    user_id: userId,
    body,
  });

  if (error) {
    setToast(error.message || "Could not post comment.");
    setTimeout(() => setToast(null), 1600);
    return;
  }

  setPosts((prev) =>
    prev.map((post) =>
      post.id === postId ? { ...post, comments: post.comments + 1 } : post
    )
  );

  setCommentDraft("");
  setCommentSheet(null);
  setToast("Comment posted.");
  setTimeout(() => setToast(null), 1400);
};

  const handleShare = (action: string) => {
    setShareSheet(null);
    setToast(action);
    setTimeout(() => setToast(null), 1400);
  };

  const openMapHref = "/rides/track?live=1";

  const visibleOffset = refreshing ? PULL_THRESHOLD : pullY;
  const pullProgress = Math.min(1, pullY / PULL_THRESHOLD);
  const willRefresh = pullY >= PULL_THRESHOLD;

  if (loading && !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-white/50">
          Opening...
        </p>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main
      className="min-h-screen bg-[#050505] pb-32 text-white"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-end justify-between px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-[#e87a82]">
              The Feed
            </p>
            <h1 className="font-serif text-2xl italic text-white">
              Crimson Society
            </h1>
          </div>
          <Link
            href="/create"
            className="rounded-full bg-[#b4141e] px-4 py-2 text-xs uppercase tracking-[0.25em] text-white shadow-[0_0_20px_rgba(180,20,30,0.35)] hover:bg-[#d11827]"
          >
            + Post
          </Link>
        </div>
      </header>

      <div
        className="pointer-events-none absolute left-0 right-0 z-30 flex items-center justify-center"
        style={{
          height: `${visibleOffset}px`,
          opacity: visibleOffset > 6 ? 1 : 0,
          transition:
            refreshing || pullY === 0
              ? "height 0.3s ease, opacity 0.3s ease"
              : "none",
        }}
      >
        <div className="flex flex-col items-center gap-1.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full border bg-[#0a0a0b]/90 backdrop-blur ${
              willRefresh || refreshing
                ? "border-[#b4141e] text-[#e87a82] shadow-[0_0_18px_rgba(180,20,30,0.5)]"
                : "border-white/15 text-white/50"
            }`}
            style={{
              transform: refreshing
                ? "rotate(360deg)"
                : `rotate(${pullProgress * 360}deg)`,
              animation: refreshing ? "spin 0.7s linear infinite" : "none",
            }}
          >
            ↻
          </div>
          <p className="text-[9px] uppercase tracking-[0.35em] text-white/50">
            {refreshing ? "Refreshing" : willRefresh ? "Release" : "Pull"}
          </p>
        </div>
      </div>

      <div
        style={{
          transform: `translateY(${visibleOffset}px)`,
          transition: refreshing || pullY === 0 ? "transform 0.3s ease" : "none",
        }}
      >
        <div className="mx-auto max-w-2xl px-5 pt-6">
          <section className="space-y-4">
            {dashboardLoading ? (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
                <div className="h-40 animate-pulse bg-white/10" />
                <div className="space-y-3 p-4">
                  <div className="h-3 w-36 rounded-full bg-white/10" />
                  <div className="h-6 w-48 rounded-full bg-white/10" />
                  <div className="h-3 w-56 max-w-full rounded-full bg-white/10" />
                </div>
              </div>
            ) : (
              <article className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707]">
                <div className="relative h-44 bg-[#07080a]">
                  <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:28px_28px]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_35%,rgba(180,20,30,0.32),transparent_22%),radial-gradient(circle_at_78%_58%,rgba(232,122,130,0.18),transparent_18%),linear-gradient(135deg,transparent_12%,rgba(180,20,30,0.22)_13%,transparent_15%,transparent_62%,rgba(255,255,255,0.08)_64%,transparent_66%)]" />
                  <div className="absolute left-[8%] right-[12%] top-[46%] h-px rotate-[-12deg] bg-[#b4141e]/55 shadow-[0_0_16px_rgba(180,20,30,0.35)]" />
                  <div className="absolute left-[22%] right-[8%] top-[62%] h-px rotate-[16deg] bg-[#f1c3c7]/18" />
                  <div className="absolute left-[14%] top-[20%] h-2 w-2 rounded-full bg-[#b4141e]/70 shadow-[0_0_22px_rgba(180,20,30,0.55)]" />
                  <div className="absolute right-[20%] top-[46%] h-1.5 w-1.5 rounded-full bg-[#f1c3c7]/45" />
                  <div className="absolute left-4 top-4 rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-[#f1c3c7]">
                    Who&apos;s riding tonight?
                  </div>

                  {liveMapPreview.activeRiderCount > 0 ? (
                    <>
                      {liveMapPreview.riders.slice(0, 5).map((rider, index) => (
                        <div
                          key={rider.userId}
                          className="absolute h-9 w-9 rounded-full"
                          style={getPreviewMarkerStyle(rider, liveMapPreview.riders, index)}
                          title={rider.username ? `@${rider.username}` : rider.name}
                        >
                          <span className="absolute inset-0 rounded-full bg-[#b4141e]/45 animate-ping" />
                          <div className="absolute inset-0 overflow-hidden rounded-full border-2 border-[#f1c3c7] bg-[#160709] shadow-[0_0_0_6px_rgba(180,20,30,0.16),0_12px_28px_rgba(0,0,0,0.55)]">
                            {rider.photo ? (
                              <Image
                                src={rider.photo}
                                alt={rider.name}
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase text-[#f1c3c7]">
                                {rider.name.charAt(0)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-[#e87a82]">
                          Live now
                        </p>
                        <h2 className="mt-1 truncate font-serif text-3xl leading-none text-white">
                          {liveMapPreview.ride?.name || "Active rides"}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em] text-zinc-300">
                          <span className="rounded-full border border-white/10 bg-black/35 px-2.5 py-1">
                            {liveMapPreview.activeRiderCount} rider{liveMapPreview.activeRiderCount === 1 ? "" : "s"} live
                          </span>
                          <span className="rounded-full border border-white/10 bg-black/35 px-2.5 py-1">
                            {liveMapPreview.activeMeetCount} active meet{liveMapPreview.activeMeetCount === 1 ? "" : "s"}
                          </span>
                          <span className="rounded-full border border-white/10 bg-black/35 px-2.5 py-1">
                            {formatLiveUpdated(liveMapPreview.lastUpdatedAt)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                        No live riders
                      </p>
                      <h2 className="mt-1 font-serif text-3xl leading-none text-white">
                        The map is quiet.
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        Live locations appear here when a ride is active and riders choose to share.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 p-4">
                  <p className="min-w-0 truncate text-xs uppercase tracking-[0.16em] text-zinc-500">
                    {liveMapPreview.ride?.city || "Crimson live tracking"}
                  </p>
                  <Link
                    href={openMapHref}
                    className="shrink-0 rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#f1c3c7] transition hover:bg-[#b4141e]/25"
                  >
                    View Map
                  </Link>
                </div>
              </article>
            )}

            <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-[#f1c3c7]">
                  Upcoming Meets
                </p>
                <Link
                  href="/rides"
                  className="rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-zinc-400 transition hover:border-[#b4141e]/50 hover:text-[#e87a82]"
                >
                  See All
                </Link>
              </div>

              <div className="mt-4 grid gap-3">
                {dashboardLoading &&
                  Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="overflow-hidden rounded-xl border border-white/10 bg-black/25 p-3">
                      <div className="flex animate-pulse items-center gap-3">
                        <div className="h-16 w-16 shrink-0 rounded-lg bg-white/10" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="h-4 w-40 max-w-full rounded-full bg-white/10" />
                          <div className="h-3 w-52 max-w-full rounded-full bg-white/10" />
                          <div className="h-3 w-32 max-w-full rounded-full bg-white/10" />
                        </div>
                      </div>
                    </div>
                  ))}

                {!dashboardLoading && dashboardMeets.length === 0 && (
                  <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-zinc-400">
                    No upcoming Meets are on the ledger yet.
                  </div>
                )}

                {!dashboardLoading &&
                  dashboardMeets.slice(0, 3).map((meet) => (
                    <Link
                      key={meet.id}
                      href={`/rides?meet=${meet.id}`}
                      className="block overflow-hidden rounded-xl border border-white/10 bg-black/25 p-3 transition hover:border-[#b4141e]/45 hover:bg-[#b4141e]/10"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#b4141e]/30 bg-gradient-to-br from-[#3a0709] via-[#140608] to-black">
                          {meet.cover ? (
                            <Image
                              src={meet.cover}
                              alt={meet.name}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          ) : (
                            <>
                              <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(135deg,transparent_0%,transparent_42%,rgba(255,255,255,0.14)_43%,transparent_46%,transparent_100%)]" />
                              <div className="absolute bottom-2 left-2 right-2 truncate text-[8px] uppercase tracking-[0.16em] text-[#f1c3c7]">
                                Meet
                              </div>
                            </>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 overflow-hidden">
                          <h3 className="truncate font-serif text-lg leading-tight text-white">
                            {meet.name}
                          </h3>
                          <p className="mt-1 truncate text-[10px] uppercase tracking-[0.1em] text-[#e87a82]">
                            {formatMeetTime(meet.date, meet.time)}
                          </p>
                          <p className="mt-1 truncate text-xs leading-5 text-zinc-400">
                            {meet.meetPoint}
                          </p>
                          <div className="mt-1.5 flex min-w-0 items-center gap-2">
                            <p className="min-w-0 truncate text-[10px] uppercase tracking-[0.1em] text-zinc-500">
                              {meet.city}
                            </p>
                            <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[8px] uppercase tracking-[0.08em] text-zinc-500">
                              {meet.riderCount} going
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            </section>
          </section>

          <div className="mt-7 mb-3 flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">
                Latest Posts
              </p>
              <h2 className="mt-1 font-serif text-2xl italic text-white">From the society</h2>
            </div>
          </div>

          <div className="space-y-6">
            {feedLoading && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex animate-pulse items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 rounded-full bg-white/10" />
                    <div className="h-2 w-44 rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
            )}

            {posts.map((p, postIndex) => {
              const count = likeCounts[p.id] ?? p.likes;
              const isLiked = !!liked[p.id];
              const isBookmarked = !!bookmarked[p.id];
              const photos = p.photos ?? [];
              const canDeletePost = Boolean(
                p.userId && session?.user?.id && (p.userId === session.user.id || isAdmin),
              );
              const profileHref = getProfileHref(p.author.handle);

              const avatar = (
                <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/10">
                  {p.author.photo ? (
                    <Image
                      src={p.author.photo}
                      alt={p.author.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#b4141e] font-serif italic text-white">
                      CS
                    </div>
                  )}
                </div>
              );

              const authorDetails = (
                <div className="flex-1 min-w-0">
                  <p className="break-words text-sm text-white">{p.author.name}</p>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                    {p.author.handle}
                    {p.location && ` · ${p.location}`}
                  </p>
                </div>
              );

              return (
                <article
                  key={p.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707]"
                >
                  <div className="flex items-center gap-3 p-4">
                    {profileHref ? (
                      <>
                        <Link href={profileHref} className="shrink-0">
                          {avatar}
                        </Link>
                        <Link href={profileHref} className="flex-1 min-w-0">
                          {authorDetails}
                        </Link>
                      </>
                    ) : (
                      <>
                        {avatar}
                        {authorDetails}
                      </>
                    )}

                    <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                      {p.timeLabel}
                    </span>

                    {canDeletePost && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuId((current) => (current === p.id ? null : p.id))
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-lg leading-none text-white/60 hover:border-white/25 hover:text-white"
                          aria-label="Post options"
                        >
                          ⋯
                        </button>

                        {openMenuId === p.id && (
                          <div className="absolute right-0 top-10 z-30 w-40 overflow-hidden rounded-2xl border border-white/10 bg-[#090909] shadow-2xl">
                            <button
                              type="button"
                              onClick={() => void deletePost(p)}
                              disabled={deletingPostId === p.id}
                              className="w-full px-4 py-3 text-left text-xs uppercase tracking-[0.2em] text-[#e87a82] hover:bg-[#b4141e]/15 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingPostId === p.id ? "Deleting" : "Delete"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {p.type === "photo" && photos.length > 0 && (
                    <div
                      ref={(el) => {
                        carouselRefs.current[p.id] = el;
                      }}
                      className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
                    >
                      {photos.map((src, idx) => (
                        <div
                          key={`${p.id}-${idx}`}
                          className="relative aspect-square w-full flex-shrink-0 snap-center bg-black"
                        >
                          <Image
                            src={src}
                            alt={`${p.author.name} post image ${idx + 1}`}
                            fill
                            sizes="(max-width: 768px) 100vw, 768px"
                            priority={postIndex === 0 && idx === 0}
                            quality={88}
                            className="object-cover"
                          />
                          {photos.length > 1 && (
                            <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white backdrop-blur">
                              {idx + 1} / {photos.length}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {p.type === "reel" && (
                    <div className="relative aspect-[9/16] max-h-[560px] bg-black">
                      {p.video ? (
                        <video
                          src={p.video}
                          className="h-full w-full object-cover"
                          muted
                          autoPlay
                          loop
                          playsInline
                          preload="metadata"
                        />
                      ) : photos[0] ? (
                        <Image
                          src={photos[0]}
                          alt={`${p.author.name} reel cover`}
                          fill
                          sizes="(max-width: 768px) 100vw, 768px"
                          priority={postIndex === 0}
                          quality={86}
                          className="object-cover"
                        />
                      ) : p.mediaStatus === "queued" || p.mediaStatus === "processing" ? (
                        <div className="flex h-full w-full items-center justify-center px-6 text-center">
                          <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">
                            Reel processing for cinematic playback
                          </p>
                        </div>
                      ) : null}

                      {p.sound && (
                        <div className="absolute bottom-3 left-3 right-3 flex">
                          <CrimsonSoundAttribution sound={p.sound} compact />
                        </div>
                      )}
                    </div>
                  )}

                  {p.type === "status" && p.statusText && (
                    <div
                      className={`flex min-h-[260px] items-center justify-center p-8 ${
                        statusBgMap[p.statusBg || "noir"] || statusBgMap.noir
                      }`}
                    >
                      <p className="text-center font-serif text-2xl italic text-white">
                        {p.statusText}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 px-4 pt-3">
                    <button
                      onClick={() => toggleLike(p.id)}
                      className="flex items-center gap-1.5"
                      aria-label="Like"
                    >
                      <span
                        className={`text-2xl transition-transform ${
                          isLiked ? "text-[#b4141e]" : "text-white/70"
                        } ${popId === p.id ? "scale-125" : ""}`}
                      >
                        {isLiked ? "♥" : "♡"}
                      </span>
                      <span className="text-xs text-white/70">{count}</span>
                    </button>

                    <button
                      onClick={() => setCommentSheet(p.id)}
                      className="flex items-center gap-1.5 text-white/70 hover:text-white"
                      aria-label="Comment"
                    >
                      <span className="text-xl">💬</span>
                      <span className="text-xs">{p.comments}</span>
                    </button>

                    <button
                      onClick={() => setShareSheet(p.id)}
                      className="text-xl text-white/70 hover:text-white"
                      aria-label="Share"
                    >
                      ↗
                    </button>

                    <button
                      onClick={() => toggleBookmark(p.id)}
                      className={`ml-auto text-2xl transition ${
                        isBookmarked ? "text-[#e87a82]" : "text-white/70"
                      }`}
                      aria-label="Bookmark"
                    >
                      {isBookmarked ? "▰" : "▱"}
                    </button>
                  </div>

                  {p.type !== "status" && p.caption && (
                    <p className="px-4 pb-2 pt-2 text-sm text-white/85">
                      <span className="text-white">{profileHref ? (
                        <Link href={profileHref} className="hover:text-[#e87a82] transition">
                          {p.author.handle}
                        </Link>
                      ) : (
                        p.author.handle
                      )}</span>{" "}
                      {p.caption}
                    </p>
                  )}

                  {p.type === "photo" && p.sound && (
                    <div className="px-4 pb-2 pt-2">
                      <CrimsonSoundAttribution sound={p.sound} compact />
                    </div>
                  )}

                  {p.taggedRiders && p.taggedRiders.length > 0 && (
                    <p className="px-4 pb-4 text-[11px] text-[#e87a82]">
                      with {p.taggedRiders.join(" · ")}
                    </p>
                  )}

                  {(p.type === "status" ||
                    (!p.caption && (!p.taggedRiders || p.taggedRiders.length === 0))) && (
                    <div className="pb-4" />
                  )}
                </article>
              );
            })}
          </div>

          <div className="mt-10 flex items-center justify-center gap-3 text-white/30">
            <div className="h-px w-12 bg-white/15" />
            <span className="text-xs">✦</span>
            <div className="h-px w-12 bg-white/15" />
          </div>

          <p className="mt-4 text-center text-[10px] uppercase tracking-[0.4em] text-white/30">
            © Crimson Society · MMXXVI
          </p>
        </div>
      </div>

      {commentSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setCommentSheet(null)}
        >
          <div
            className="w-full max-w-2xl rounded-t-3xl border-t border-white/10 bg-[#0a0a0b] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">
                  Reply
                </p>
                <h2 className="font-serif text-2xl italic text-white">
                  Comments
                </h2>
              </div>
              <button
                onClick={() => setCommentSheet(null)}
                className="rounded-full border border-white/10 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-white/70 hover:bg-white/5"
              >
                Close
              </button>
            </div>

            <div className="mb-4 space-y-3 text-sm text-white/60">
              <p>No comments yet. Be the first to weigh in.</p>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2">
              <input
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendComment()}
                placeholder="Say something..."
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
              <button
                onClick={sendComment}
                className="rounded-full bg-[#b4141e] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white hover:bg-[#d11827]"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {shareSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShareSheet(null)}
        >
          <div
            className="w-full max-w-2xl rounded-t-3xl border-t border-white/10 bg-[#0a0a0b] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">
                Send to
              </p>
              <h2 className="font-serif text-2xl italic text-white">Share</h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleShare("Copied link.")}
                className="rounded-xl border border-white/10 bg-black/40 p-4 text-left hover:border-[#b4141e]/40"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white">
                  Copy Link
                </p>
                <p className="mt-1 text-[10px] text-white/40">
                  crimsonsociety.app/...
                </p>
              </button>

              <button
                onClick={() => handleShare("Added to story.")}
                className="rounded-xl border border-white/10 bg-black/40 p-4 text-left hover:border-[#b4141e]/40"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white">
                  Add to Story
                </p>
                <p className="mt-1 text-[10px] text-white/40">Visible 24h</p>
              </button>

              <button
                onClick={() => handleShare("Reposted.")}
                className="rounded-xl border border-white/10 bg-black/40 p-4 text-left hover:border-[#b4141e]/40"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white">
                  Repost
                </p>
                <p className="mt-1 text-[10px] text-white/40">To your feed</p>
              </button>

              <button
                onClick={() => handleShare("Sent in DM.")}
                className="rounded-xl border border-white/10 bg-black/40 p-4 text-left hover:border-[#b4141e]/40"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white">
                  Send DM
                </p>
                <p className="mt-1 text-[10px] text-white/40">Pick a rider</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-[#b4141e]/40 bg-[#0a0a0b]/95 px-5 py-2.5 text-xs uppercase tracking-[0.3em] text-white shadow-[0_0_30px_rgba(180,20,30,0.4)] backdrop-blur">
          {toast}
        </div>
      )}
    </main>
  );
}
