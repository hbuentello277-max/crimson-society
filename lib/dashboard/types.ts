import type { CrimsonSound } from "@/lib/sounds";
import type { DashboardMapMeet } from "@/lib/meets/dashboard-map";

export type DashboardPostType = "photo" | "reel" | "status" | "garage_build";

export type DashboardFeedPost = {
  id: string;
  userId?: string;
  type: DashboardPostType;
  author: { name: string; handle: string; photo: string | null };
  location?: string;
  caption?: string;
  photos?: string[];
  video?: string | null;
  videoThumbnail?: string | null;
  sound?: CrimsonSound | null;
  statusText?: string;
  statusBg?: string;
  mediaStatus?: string;
  garageRideLabel?: string;
  garageModificationTitle?: string;
  taggedRiders?: string[];
  timeLabel: string;
  likes: number;
  comments: number;
};

export type DashboardRawProfile = {
  id?: string;
  username?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  profile_image_url?: string | null;
} | null;

export type DashboardRawPost = {
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
  media_metadata?: Record<string, unknown> | null;
  created_at: string;
  profiles?: DashboardRawProfile | DashboardRawProfile[];
  post_likes?: { count: number }[];
  post_comments?: { count: number }[];
  post_sounds?: {
    id: string;
    sounds: CrimsonSound | CrimsonSound[] | null;
  }[];
};

export type DashboardRoutePoint = {
  lat: number;
  lng: number;
};

export type DashboardRideWaypoint = DashboardRoutePoint & {
  id: string;
  label: string;
};

export type DashboardRideRow = {
  id: string;
  host_id: string;
  co_host_id?: string | null;
  name: string;
  date: string | null;
  time: string | null;
  meet_point: string | null;
  destination: string | null;
  city: string | null;
  cover: string | null;
  route: unknown;
  waypoints: unknown;
  tracking_status: string | null;
  started_at: string | null;
  meet_duration_minutes?: number | null;
  status?: string | null;
  meet_point_lat: number | null;
  meet_point_lng: number | null;
  distance: string | null;
  duration: string | null;
  privacy: string | null;
  visibility: string | null;
};

export type DashboardAttendeeRow = {
  ride_id: string;
};

export type DashboardLiveLocationRow = {
  ride_id: string;
  user_id: string;
  lat: number;
  lng: number;
  updated_at: string;
};

export type DashboardProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  profile_image_url: string | null;
  avatar_url: string | null;
};

export type DashboardMeet = DashboardMapMeet;

export type DashboardLiveRider = {
  userId: string;
  name: string;
  username: string | null;
  photo: string | null;
  lat: number;
  lng: number;
};

export type DashboardLiveMapPreview = {
  ride: DashboardMeet | null;
  activeRiderCount: number;
  activeMeetCount: number;
  lastUpdatedAt: string | null;
  riders: DashboardLiveRider[];
};

export const emptyDashboardLiveMapPreview: DashboardLiveMapPreview = {
  ride: null,
  activeRiderCount: 0,
  activeMeetCount: 0,
  lastUpdatedAt: null,
  riders: [],
};
