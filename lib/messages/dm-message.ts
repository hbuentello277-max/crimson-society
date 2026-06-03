export const DM_MESSAGE_MEDIA_BUCKET = "message-media";

export const DM_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const DM_AUDIO_MAX_BYTES = 10 * 1024 * 1024;

export const DM_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export const DM_AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/webm",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
]);

export type DmMessageType = "text" | "image" | "audio" | "system";

export type DmMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  message_type?: string | null;
  media_url?: string | null;
  media_path?: string | null;
  media_mime_type?: string | null;
  media_size_bytes?: number | null;
  media_duration_seconds?: number | null;
  media_width?: number | null;
  media_height?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

export type DmMessage = {
  id: string;
  messageType: DmMessageType;
  text: string;
  senderId: string;
  senderName?: string;
  senderPhoto?: string | null;
  timeLabel: string;
  createdAt: string;
  mediaUrl?: string | null;
  mediaPath?: string | null;
  mediaMimeType?: string | null;
  mediaSizeBytes?: number | null;
  mediaDurationSeconds?: number | null;
};

export function normalizeDmMessageType(value?: string | null): DmMessageType {
  if (value === "image" || value === "audio" || value === "system") return value;
  return "text";
}

export function dmMessagePreview(row: Pick<DmMessageRow, "message_type" | "body">) {
  const type = normalizeDmMessageType(row.message_type);
  if (type === "image") return "Photo";
  if (type === "audio") return "Voice message";
  if (type === "system") return "System message";
  const text = (row.body || "").trim();
  return text || "Message";
}

export function extensionForMime(mime: string) {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    case "audio/mpeg":
      return "mp3";
    case "audio/mp4":
    case "audio/m4a":
    case "audio/x-m4a":
      return "m4a";
    case "audio/webm":
      return "webm";
    case "audio/aac":
      return "aac";
    default:
      return "bin";
  }
}

export function safeMediaFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "upload";
}

export function buildDmMediaPath(conversationId: string, messageId: string, mime: string) {
  return `${conversationId}/${messageId}.${extensionForMime(mime)}`;
}

export function validateDmImageFile(file: File) {
  if (!DM_IMAGE_MIME_TYPES.has(file.type)) {
    return "Choose a JPEG, PNG, WebP, GIF, or HEIC image.";
  }
  if (file.size > DM_IMAGE_MAX_BYTES) {
    return "Images must be 8 MB or smaller.";
  }
  return null;
}

export function validateDmAudioFile(file: File) {
  const mime = file.type?.trim().toLowerCase();
  if (!mime || !DM_AUDIO_MIME_TYPES.has(mime)) {
    return "Unsupported audio format.";
  }
  if (file.size > DM_AUDIO_MAX_BYTES) {
    return "Voice messages must be 10 MB or smaller.";
  }
  if (file.size === 0) {
    return "Recording is empty.";
  }
  return null;
}

export function isDmAudioMime(mime: string) {
  return DM_AUDIO_MIME_TYPES.has(mime.trim().toLowerCase());
}

export function isDmImageMime(mime: string) {
  return DM_IMAGE_MIME_TYPES.has(mime.trim().toLowerCase());
}
