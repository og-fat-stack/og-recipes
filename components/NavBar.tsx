"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Start" },
  { href: "/plan", label: "Plan" },
  { href: "/recipes", label: "Rezepte" },
  { href: "/water", label: "Wasser" },
  { href: "/expenses", label: "Ausgaben" },
  { href: "/weight", label: "Gewicht" },
  { href: "/history", label: "Verlauf" },
  { href: "/profile", label: "Profil" },
] as const;

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-4xl items-center gap-1 overflow-x-auto px-4 py-3">
        <span className="mr-4 font-semibold tracking-tight">og-recipes</span>
        {TABS.map((t) => {
          const active =
            t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={
                "rounded-full px-3 py-1.5 text-sm transition-colors " +
                (active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900")
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
