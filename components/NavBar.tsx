"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "../app/login/actions";

const TABS = [
  { href: "/", label: "Start" },
  { href: "/plan", label: "Plan" },
  { href: "/recipes", label: "Rezepte" },
  { href: "/training", label: "Training" },
  { href: "/weight", label: "Gewicht" },
  { href: "/measurements", label: "Maße" },
  { href: "/memory", label: "Memory" },
  { href: "/profile", label: "Profil" },
] as const;

export function NavBar({ userName }: { userName: string | null }) {
  const pathname = usePathname();
  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <nav className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-4xl items-center gap-1 overflow-x-auto px-4 py-3">
        <span className="mr-4 font-semibold tracking-tight">OG Recipes</span>
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
                  ? "bg-contrast text-on-contrast"
                  : "text-ink-muted hover:bg-surface-subtle")
              }
            >
              {t.label}
            </Link>
          );
        })}
        <form action={logout} className="ml-auto flex items-center gap-2">
          {userName && (
            <span className="hidden whitespace-nowrap text-sm text-ink-subtle sm:inline">
              {userName}
            </span>
          )}
          <button
            type="submit"
            className="rounded-full px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-subtle"
          >
            Abmelden
          </button>
        </form>
      </div>
    </nav>
  );
}
