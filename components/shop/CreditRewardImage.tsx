"use client";

import Image from "next/image";

const PLACEHOLDER_SRC = "/icon.png";

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
  const imageSrc = src?.trim() ? src : PLACEHOLDER_SRC;

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill={fill}
      sizes={sizes}
      className={className}
    />
  );
}
