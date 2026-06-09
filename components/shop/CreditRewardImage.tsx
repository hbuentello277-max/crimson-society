"use client";

import Image from "next/image";
import { CrimsonCoinIcon } from "@/components/credits/CrimsonCoinIcon";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  fill?: boolean;
  sizes?: string;
};

export function CreditRewardImage({
  src,
  alt = "",
  className = "object-cover",
  fill = true,
  sizes = "(max-width: 640px) 50vw, 320px",
}: Props) {
  if (!src?.trim()) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#120608] to-black">
        <CrimsonCoinIcon size={48} className="opacity-90 drop-shadow-[0_0_16px_rgba(180,20,30,0.45)]" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      sizes={sizes}
      className={className}
    />
  );
}
