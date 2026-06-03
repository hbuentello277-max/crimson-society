"use client";

import Image from "next/image";
import { CS_AVATAR_FALLBACK, CS_AVATAR_RING } from "@/lib/crimson-accent";

export function MessagesAvatar({
  photo,
  name,
  online,
  isGroup,
  size = 48,
}: {
  photo: string | null;
  name: string;
  online?: boolean;
  isGroup?: boolean;
  size?: number;
}) {
  const initialSizeClass =
    size >= 56 ? "text-xl" : size >= 42 ? "text-lg" : size >= 32 ? "text-sm" : "text-xs";

  return (
    <div
      className={`relative shrink-0 ${CS_AVATAR_RING}`}
      style={{ height: size, width: size }}
    >
      {photo ? (
        <Image
          src={photo}
          alt={name}
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized={photo.includes("supabase")}
        />
      ) : (
        <div className={`${CS_AVATAR_FALLBACK} ${initialSizeClass}`}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      {online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0c0c0d] bg-[#b4141e]" />
      )}

      {isGroup && (
        <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full border border-[#0c0c0d] bg-[#b4141e]/20 text-[8px] text-[#e87a82]">
          ◈
        </span>
      )}
    </div>
  );
}
