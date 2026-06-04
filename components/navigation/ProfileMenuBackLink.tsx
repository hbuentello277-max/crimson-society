"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { profileMenuBackHref } from "@/lib/navigation/profile-menu-return";

type Props = {
  className?: string;
  children?: React.ReactNode;
  fallbackHref?: string;
};

export function ProfileMenuBackLink({
  className,
  children = "← Back",
  fallbackHref = "/profile",
}: Props) {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const href = profileMenuBackHref(from, fallbackHref);

  return (
    <Link href={href} prefetch className={className}>
      {children}
    </Link>
  );
}
