"use client";

import Image from "next/image";

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
  return (
    <div
      className="relative flex-shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#b4141e]"
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
        <div className="flex h-full w-full items-center justify-center font-serif italic text-white">
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      {online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0c0c0d] bg-[#b4141e]" />
      )}

      {isGroup && (
        <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full border border-[#0c0c0d] bg-[#b4141e] text-[8px] text-white">
          ◈
        </span>
      )}
    </div>
  );
}
