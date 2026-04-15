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
          ? "bg-amber-500 text-white hover:bg-amber-600"
          : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900")
      }
    >
      {pending ? "Refreshing..." : "Recalculate macros from 7-day avg"}
    </button>
  );
}
