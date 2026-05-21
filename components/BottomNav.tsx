"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    href: "/dashboard",
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9z" />
      </svg>
    ),
  },
  {
    href: "/connect",
    label: "Riders",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <circle cx="11" cy="11" r="6" />
        <path d="m21 21-5-5" />
      </svg>
    ),
  },
  {
    href: "/messages",
    label: "Messages",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M4 6.5C4 5.4 4.9 4.5 6 4.5h12c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H9l-4 3v-3H6c-1.1 0-2-.9-2-2v-9z" />
      </svg>
    ),
  },
  {
    href: "/rides",
    label: "Rides",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <circle cx="5.5" cy="17" r="3" />
        <circle cx="18.5" cy="17" r="3" />
        <path d="M8 17h4l4-7h3" />
        <path d="M10 6h4l2 4" />
      </svg>
    ),
  },
  {
    href: "/shop",
    label: "Shop",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M5 8h14l-1.5 11a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 8z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <circle cx="12" cy="8.5" r="3.75" />
        <path d="M4.5 20c0-3.5 3.4-6 7.5-6s7.5 2.5 7.5 6" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  const hideOn = ["/", "/login", "/signup", "/profile/setup"];
  if (hideOn.includes(pathname)) return null;
  if (pathname.startsWith("/messages/")) return null;

  const isActive = (href: string) => {
    if (href === "/messages") return pathname === "/messages";
    if (href === "/profile") return pathname === "/profile";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#050505]/90 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-3xl items-center justify-around px-2 py-3">
        {NAV.map((n) => {
          const active = isActive(n.href);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                className={`flex flex-col items-center gap-1 px-1.5 py-1 transition ${
                  active ? "text-[#e87a82]" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span className={active ? "drop-shadow-[0_0_8px_rgba(232,122,130,0.7)]" : ""}>
                  {n.icon}
                </span>
                <span className="text-[9px] uppercase tracking-[0.2em]">
                  {n.label}
                </span>
                {active && (
                  <span className="h-0.5 w-5 rounded-full bg-[#b4141e] shadow-[0_0_8px_rgba(180,20,30,0.8)]" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}