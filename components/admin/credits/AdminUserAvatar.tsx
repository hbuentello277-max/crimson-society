const FALLBACK_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect fill='%23222' width='40' height='40'/%3E%3Ccircle cx='20' cy='15' r='7' fill='%23555'/%3E%3Cellipse cx='20' cy='32' rx='11' ry='8' fill='%23555'/%3E%3C/svg%3E";

type Props = {
  src: string | null | undefined;
  alt: string;
  size?: "sm" | "md";
};

const sizeClass = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
};

export function AdminUserAvatar({ src, alt, size = "sm" }: Props) {
  return (
    <img
      src={src || FALLBACK_AVATAR}
      alt={alt}
      className={`${sizeClass[size]} shrink-0 rounded-full border border-white/10 object-cover bg-zinc-900`}
    />
  );
}
