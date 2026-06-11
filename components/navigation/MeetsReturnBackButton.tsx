"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { isMeetsReturnContext } from "@/lib/navigation/meets-return";

type Props = {
  className?: string;
  label?: string;
};

export function MeetsReturnBackButton({
  className = "text-xs uppercase tracking-[0.2em] text-zinc-500 transition hover:text-[#e87a82]",
  label = "← Meets",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleBack = () => {
    if (isMeetsReturnContext(searchParams) && typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/meets");
  };

  return (
    <button type="button" onClick={handleBack} className={className}>
      {label}
    </button>
  );
}
