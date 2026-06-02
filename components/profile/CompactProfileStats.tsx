import Link from "next/link";

export type ProfileStatItem = {
  label: string;
  value: number;
  href?: string | null;
};

export function CompactProfileStats({ items }: { items: ProfileStatItem[] }) {
  return (
    <div className="mt-1.5 grid grid-cols-3 border-t border-white/10 pt-1.5">
      {items.map((item, index) => {
        const content = (
          <>
            <p className="text-xl font-semibold leading-none text-white">{item.value}</p>
            <p className="mt-0.5 text-sm leading-tight text-zinc-500">{item.label}</p>
          </>
        );

        const className = `flex min-w-0 flex-col items-center justify-center px-1.5 py-0 text-center ${
          index < items.length - 1 ? "border-r border-white/10" : ""
        }`;

        if (item.href) {
          return (
            <Link
              key={item.label}
              href={item.href}
              prefetch
              className={`${className} transition hover:text-[#e87a82]`}
            >
              {content}
            </Link>
          );
        }

        return (
          <div key={item.label} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
