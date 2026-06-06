import { NEXUS_MISSION_WORKFLOW_SLUGS, type NexusMissionWorkflowSlug } from "@/lib/nexus/constants";
import type { MissionWorkflowSlug } from "@/lib/mission-health/types";

export type MissionThresholdMode = "min_activity" | "max_failures" | "max_pending";

export type MissionWorkflowDefinition = {
  slug: MissionWorkflowSlug;
  display_name: string;
  category: string;
  weight: number;
  description: string;
  threshold_mode: MissionThresholdMode;
  warning_threshold: number;
  critical_threshold: number;
  activity_window_minutes: number;
};

export const MISSION_WORKFLOW_REGISTRY: Record<MissionWorkflowSlug, MissionWorkflowDefinition> = {
  user_signup: {
    slug: "user_signup",
    display_name: "User Signup",
    category: "auth",
    weight: 1.0,
    description: "New member account creation",
    threshold_mode: "min_activity",
    warning_threshold: 1,
    critical_threshold: 0,
    activity_window_minutes: 1440,
  },
  user_login: {
    slug: "user_login",
    display_name: "User Login",
    category: "auth",
    weight: 1.0,
    description: "Member authentication sessions",
    threshold_mode: "min_activity",
    warning_threshold: 1,
    critical_threshold: 0,
    activity_window_minutes: 60,
  },
  profile_setup: {
    slug: "profile_setup",
    display_name: "Profile Setup",
    category: "auth",
    weight: 0.8,
    description: "Username and profile completion",
    threshold_mode: "min_activity",
    warning_threshold: 1,
    critical_threshold: 0,
    activity_window_minutes: 1440,
  },
  post_creation: {
    slug: "post_creation",
    display_name: "Post Creation",
    category: "social",
    weight: 0.9,
    description: "Community post publishing",
    threshold_mode: "min_activity",
    warning_threshold: 1,
    critical_threshold: 0,
    activity_window_minutes: 1440,
  },
  meet_creation: {
    slug: "meet_creation",
    display_name: "Meet Creation",
    category: "meets",
    weight: 1.0,
    description: "Ride/meet creation flow",
    threshold_mode: "min_activity",
    warning_threshold: 1,
    critical_threshold: 0,
    activity_window_minutes: 1440,
  },
  meet_joining: {
    slug: "meet_joining",
    display_name: "Meet Joining",
    category: "meets",
    weight: 1.0,
    description: "Ride/meet attendance joins",
    threshold_mode: "min_activity",
    warning_threshold: 1,
    critical_threshold: 0,
    activity_window_minutes: 1440,
  },
  messaging: {
    slug: "messaging",
    display_name: "Messaging",
    category: "messaging",
    weight: 1.0,
    description: "Direct message delivery",
    threshold_mode: "min_activity",
    warning_threshold: 1,
    critical_threshold: 0,
    activity_window_minutes: 60,
  },
  blackcard_purchase: {
    slug: "blackcard_purchase",
    display_name: "Blackcard Purchase",
    category: "commerce",
    weight: 1.0,
    description: "Subscription checkout completion",
    threshold_mode: "min_activity",
    warning_threshold: 1,
    critical_threshold: 0,
    activity_window_minutes: 10080,
  },
  stripe_webhook_processing: {
    slug: "stripe_webhook_processing",
    display_name: "Stripe Webhook Processing",
    category: "commerce",
    weight: 1.0,
    description: "Billing webhook ingestion",
    threshold_mode: "max_failures",
    warning_threshold: 2,
    critical_threshold: 5,
    activity_window_minutes: 60,
  },
  push_notification_delivery: {
    slug: "push_notification_delivery",
    display_name: "Push Notification Delivery",
    category: "notifications",
    weight: 0.9,
    description: "FCM push job delivery",
    threshold_mode: "max_pending",
    warning_threshold: 100,
    critical_threshold: 500,
    activity_window_minutes: 60,
  },
  media_upload: {
    slug: "media_upload",
    display_name: "Media Upload",
    category: "media",
    weight: 0.9,
    description: "Image and media upload pipeline",
    threshold_mode: "max_failures",
    warning_threshold: 3,
    critical_threshold: 10,
    activity_window_minutes: 60,
  },
};

export const MISSION_WORKFLOW_SLUGS: MissionWorkflowSlug[] = [...NEXUS_MISSION_WORKFLOW_SLUGS];

export function getMissionWorkflowDefinition(
  slug: NexusMissionWorkflowSlug,
): MissionWorkflowDefinition {
  return MISSION_WORKFLOW_REGISTRY[slug];
}
