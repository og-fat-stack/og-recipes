"use client";

import { useTransition } from "react";
import { refreshMacrosFromAvg } from "./actions";

export function RefreshMacrosButton({ highlight }: { highlight?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => refreshMacrosFromAvg().then(() => {}))}
      disabled={pending}
      className={
        "rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 " +
        (highlight
          ? "bg-warn text-on-contrast hover:bg-warn"
          : "border border-line-strong text-ink-muted hover:bg-surface-subtle")
      }
    >
      {pending ? "Neu berechnen..." : "Makros aus 7-Tage-Schnitt neu berechnen"}
    </button>
  );
}
