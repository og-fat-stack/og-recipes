import type { ReactNode } from "react";

/** Primäre Absende-Schaltfläche der Auth-Seiten (hebt sich beim Hover, sinkt beim Druck). */
export function AuthSubmit({
  pending,
  children,
}: {
  pending?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-control bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 active:scale-95 disabled:pointer-events-none disabled:opacity-70"
    >
      {children}
    </button>
  );
}
