export type RoutePoint = { lat: number; lng: number };

export type MeetWaypoint = RoutePoint & { id: string; label: string };

import type { MeetVisibility } from "@/lib/meet-visibility";

export type MeetType = "Night Run" | "Track Day" | "Touring" | "Group Ride" | "Canyon Run";
export type MeetPrivacy = "Open" | "Invite" | "Blackcard";
export type MeetTrackingStatus = "not_started" | "active" | "ended";
export type MeetStatus = "active" | "canceled";

export type MeetAttendee = {
  name: string;
  photo: string;
  username?: string | null;
};

export type Meet = {
  id: string;
  hostId?: string;
  coHostId?: string | null;
  name: string;
  date: string;
  time: string;
  meetPoint: string;
  destination: string;
  city: string;
  type: MeetType;
  distance: string;
  duration: string;
  meetDurationMinutes?: number | null;
  cover: string;
  host: MeetAttendee;
  coHost?: MeetAttendee | null;
  going: MeetAttendee[];
  description: string;
  privacy: MeetPrivacy;
  visibility: MeetVisibility;
  lat: number;
  lng: number;
  destinationLat?: number | null;
  destinationLng?: number | null;
  route?: RoutePoint[];
  waypoints?: MeetWaypoint[];
  trackingStatus?: MeetTrackingStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  status?: MeetStatus;
};

export type MeetRow = {
  id: string;
  host_id: string;
  co_host_id?: string | null;
  name: string;
  date: string;
  time: string;
  meet_point: string;
  meet_point_lat: number | null;
  meet_point_lng: number | null;
  destination: string;
  destination_lat: number | null;
  destination_lng: number | null;
  city: string | null;
  type: MeetType;
  privacy: MeetPrivacy;
  visibility?: string | null;
  priority_access?: string | null;
  priority_open_at?: string | null;
  distance: string | null;
  duration: string | null;
  meet_duration_minutes?: number | null;
  description: string | null;
  cover: string | null;
  route: unknown;
  waypoints: unknown;
  tracking_status?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  status?: string | null;
  created_at?: string | null;
  attendeeRiders?: MeetAttendee[];
  host?: {
    id: string;
    username: string | null;
    display_name: string | null;
    full_name: string | null;
    profile_image_url: string | null;
    avatar_url: string | null;
  } | null;
  coHost?: {
    id: string;
    username: string | null;
    display_name: string | null;
    full_name: string | null;
    profile_image_url: string | null;
    avatar_url: string | null;
  } | null;
};
