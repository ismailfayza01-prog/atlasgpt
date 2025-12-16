"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/track", label: "Track" },
  { href: "/admin", label: "Admin" },
  { href: "/customer", label: "Customer" },
];

export function SiteNav() {
  const path = usePathname();
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold text-zinc-900">Atlas Parcel Europe</Link>
        <nav className="flex gap-1">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "px-3 py-2 rounded-md text-sm",
                path === l.href ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
