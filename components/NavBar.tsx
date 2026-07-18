"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { logout } from "../app/login/actions";

type Tab = { href: string; label: string; icon: ComponentType<{ className?: string }> };

const TABS: Tab[] = [
  { href: "/", label: "Start", icon: HomeIcon },
  { href: "/food", label: "Essen", icon: MealIcon },
  { href: "/plan", label: "Plan", icon: CalendarIcon },
  { href: "/recipes", label: "Rezepte", icon: BookIcon },
  { href: "/training", label: "Training", icon: DumbbellIcon },
  { href: "/weight", label: "Gewicht", icon: ScaleIcon },
  { href: "/measurements", label: "Maße", icon: RulerIcon },
  { href: "/memory", label: "Memory", icon: SparkIcon },
  { href: "/profile", label: "Profil", icon: UserIcon },
];

// Die ersten vier liegen im Dock, der Rest hinter „Mehr" (Bottom-Sheet).
const PRIMARY = TABS.slice(0, 4);
const OVERFLOW = TABS.slice(4);

const isActive = (href: string, path: string) =>
  href === "/" ? path === "/" : path.startsWith(href);

export function NavBar({ userName }: { userName: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Escape schließt das Sheet.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname === "/login" || pathname === "/register") return null;

  const overflowActive = OVERFLOW.some((t) => isActive(t.href, pathname));

  return (
    <>
      {/* ---------- Desktop: schlanke Kopfleiste ---------- */}
      <nav
        aria-label="Hauptnavigation"
        className="hidden border-b border-line bg-surface md:block"
      >
        <div className="mx-auto flex max-w-4xl items-center gap-1 overflow-x-auto px-4 py-3">
          <Link
            href="/"
            className="mr-3 flex shrink-0 items-center gap-1.5 font-semibold tracking-tight"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            OG Recipes
          </Link>
          {TABS.map((t) => {
            const active = isActive(t.href, pathname);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={
                  "shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors " +
                  (active
                    ? "bg-contrast text-on-contrast"
                    : "text-ink-muted hover:bg-surface-subtle")
                }
              >
                {t.label}
              </Link>
            );
          })}
          <form action={logout} className="ml-auto flex shrink-0 items-center gap-2">
            {userName && (
              <span className="whitespace-nowrap text-sm text-ink-subtle">
                {userName}
              </span>
            )}
            <button
              type="submit"
              className="rounded-full px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-subtle"
            >
              Abmelden
            </button>
          </form>
        </div>
      </nav>

      {/* ---------- Mobil: schwebendes Dock (Daumenzone) ---------- */}
      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
      >
        <div className="flex items-center gap-1 rounded-full border border-line bg-surface/85 p-1.5 shadow-lg backdrop-blur-md">
          {PRIMARY.map((t) => (
            <DockItem
              key={t.href}
              icon={t.icon}
              label={t.label}
              href={t.href}
              active={isActive(t.href, pathname)}
              onClick={() => setOpen(false)}
            />
          ))}
          <DockItem
            icon={MoreIcon}
            label="Mehr"
            active={overflowActive || open}
            expanded={open}
            onClick={() => setOpen((o) => !o)}
          />
        </div>
      </nav>

      {/* ---------- Mobil: „Mehr"-Sheet ---------- */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
        inert={!open || undefined}
      >
        <button
          type="button"
          aria-label="Menü schließen"
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-scrim transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          role="dialog"
          aria-label="Weitere Navigation"
          className={`absolute inset-x-0 bottom-0 rounded-t-card border-t border-line bg-surface px-3 pt-2.5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-lg transition-transform duration-300 ease-out ${
            open ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface-inset" />
          <div className="grid grid-cols-2 gap-2">
            {OVERFLOW.map((t) => {
              const Icon = t.icon;
              const active = isActive(t.href, pathname);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={
                    "flex items-center gap-2.5 rounded-control px-3 py-3 text-sm font-medium transition-colors " +
                    (active
                      ? "bg-contrast text-on-contrast"
                      : "bg-surface-subtle text-ink-muted")
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {t.label}
                </Link>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            {userName && (
              <span className="px-1 text-sm text-ink-muted">{userName}</span>
            )}
            <form action={logout} className="ml-auto">
              <button
                type="submit"
                className="rounded-full px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-subtle"
              >
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

/** Ein Dock-Eintrag: Icon immer, Label klappt bei aktiv als Contrast-Pille auf. */
function DockItem({
  icon: Icon,
  label,
  href,
  active,
  expanded,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  active: boolean;
  expanded?: boolean;
  onClick?: () => void;
}) {
  const open = expanded ?? active;
  const cls =
    "flex items-center rounded-full py-2.5 transition-all duration-200 " +
    (active ? "bg-contrast px-4 text-on-contrast" : "px-3 text-ink-muted");
  const inner: ReactNode = (
    <>
      <Icon className="h-6 w-6 shrink-0" />
      <span
        className={`overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-200 ${
          open ? "ml-1.5 max-w-[6rem] opacity-100" : "max-w-0 opacity-0"
        }`}
      >
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cls}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-label={label}
      className={cls}
    >
      {inner}
    </button>
  );
}

// ---- Icons (24er Viewbox, currentColor, dünne Linien) --------------------
function Ic({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <Ic className={className}>
      <path d="M3 11 12 3l9 8" />
      <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
    </Ic>
  );
}
function MealIcon({ className }: { className?: string }) {
  return (
    <Ic className={className}>
      <path d="M6 3v5.5a2 2 0 0 0 4 0V3" />
      <path d="M8 3v18M8 10.5V21" />
      <path d="M17.5 3c-1.6 2.6-2.1 5.2-2.1 7.7 0 1.6 1 2.8 2.1 2.8V21" />
    </Ic>
  );
}
function CalendarIcon({ className }: { className?: string }) {
  return (
    <Ic className={className}>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18M8 3v3M16 3v3" />
    </Ic>
  );
}
function BookIcon({ className }: { className?: string }) {
  return (
    <Ic className={className}>
      <path d="M12 6.5C10.4 5 7.8 4.5 4 4.5v13c3.8 0 6.4.5 8 2 1.6-1.5 4.2-2 8-2v-13c-3.8 0-6.4.5-8 2z" />
      <path d="M12 6.5v13" />
    </Ic>
  );
}
function DumbbellIcon({ className }: { className?: string }) {
  return (
    <Ic className={className}>
      <path d="M6.5 6.5v11M17.5 6.5v11M4 9.5v5M20 9.5v5M6.5 12h11" />
    </Ic>
  );
}
function ScaleIcon({ className }: { className?: string }) {
  return (
    <Ic className={className}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8.5 11a3.5 3.5 0 0 1 7 0" />
      <path d="M12 11l2.2-1.6" />
    </Ic>
  );
}
function RulerIcon({ className }: { className?: string }) {
  return (
    <Ic className={className}>
      <rect x="2.5" y="8.5" width="19" height="7" rx="1.5" />
      <path d="M7 8.5v2.5M11 8.5v3.5M15 8.5v2.5M19 8.5v3.5" />
    </Ic>
  );
}
function SparkIcon({ className }: { className?: string }) {
  return (
    <Ic className={className}>
      <path d="M11 3.5l1.7 4 4 1.7-4 1.7L11 15l-1.7-4-4-1.7 4-1.7z" />
      <path d="M18 14l.9 2.1 2.1.9-2.1.9L18 20l-.9-2.1-2.1-.9 2.1-.9z" />
    </Ic>
  );
}
function UserIcon({ className }: { className?: string }) {
  return (
    <Ic className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" />
    </Ic>
  );
}
function MoreIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <circle cx="5.5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="18.5" cy="12" r="1.7" />
    </svg>
  );
}
