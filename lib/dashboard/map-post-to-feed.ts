import {
  formatGarageBuildRideLabel,
  getGarageBuildPhotoUrls,
  parseGarageBuildMetadata,
} from "@/lib/garage/garage-build";
import { formatRiderHandle, formatRiderIdentity } from "@/lib/rider-identity";
import { getBestImageUrl, getVideoPlaybackUrl } from "@/lib/media";
import { getPostImageUrls } from "@/lib/posts/post-images";
import { dashboardTimeAgo } from "@/lib/dashboard/time";
import { pickDashboardProfile, pickDashboardSound } from "@/lib/dashboard/parsers";
import type { DashboardFeedPost, DashboardPostType, DashboardRawPost } from "@/lib/dashboard/types";

export function mapPostToFeed(post: DashboardRawPost): DashboardFeedPost {
  const profile = pickDashboardProfile(post.profiles);
  const sound = pickDashboardSound(post.post_sounds);
  const garageBuild = parseGarageBuildMetadata(post.media_metadata);
  const photoUrls =
    post.post_type === "photo"
      ? getPostImageUrls(post, "feed")
      : post.post_type === "garage_build"
        ? getGarageBuildPhotoUrls(
            garageBuild,
            post.image_display_url || post.image_url,
          ).map((url) => getBestImageUrl(url, null, "feed") || url)
        : [];
  const videoThumbnail = getBestImageUrl(
    post.video_thumbnail_url,
    null,
    "feed",
  );

  const name = formatRiderIdentity(profile, { fallback: "Unknown Rider" });
  const handle = formatRiderHandle(profile?.username, "@unknown");
  const photo = profile?.profile_image_url || profile?.avatar_url || null;

  return {
    id: post.id,
    userId: post.user_id,
    type: (post.post_type || "photo") as DashboardPostType,
    author: {
      name,
      handle,
      photo,
    },
    location: post.location || "",
    caption: post.caption || "",
    photos: photoUrls,
    video: getVideoPlaybackUrl(
      post.video_playback_url || post.video_url,
      post.video_hls_url,
    ),
    videoThumbnail,
    sound,
    statusText: post.status_text || "",
    statusBg: post.status_bg || "noir",
    mediaStatus: post.media_status || "ready",
    garageRideLabel: formatGarageBuildRideLabel(garageBuild),
    garageModificationTitle: garageBuild?.modification_title?.trim() || undefined,
    taggedRiders: [],
    timeLabel: dashboardTimeAgo(post.created_at),
    likes: post.post_likes?.[0]?.count || 0,
    comments: post.post_comments?.[0]?.count || 0,
  };
}
