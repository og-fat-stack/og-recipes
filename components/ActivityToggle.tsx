"use client";

import { useTransition } from "react";
import { toggleActivityEnabled } from "../app/profile/actions";

/**
 * Schalter: Training + Schritte in die Kalorienziele einrechnen? Beim
 * Umschalten werden die gespeicherten Ziele sofort neu berechnet.
 */
export function ActivityToggle({
  enabled,
  extraKcal,
}: {
  enabled: boolean;
  extraKcal: number;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => toggleActivityEnabled())}
      aria-pressed={enabled}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left hover:border-zinc-400 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      <span className="flex flex-col">
        <span className="text-sm font-medium">Aktivität einrechnen</span>
        <span className="text-xs text-zinc-500">
          {enabled
            ? `Training & Schritte: +${extraKcal} kcal/Tag im Ziel`
            : "Aus — Ziele nur aus dem Grundbedarf (keine Extra-kcal)"}
        </span>
      </span>
      <span
        className={
          "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors " +
          (enabled ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-700")
        }
      >
        <span
          className={
            "h-5 w-5 rounded-full bg-white shadow transition-transform " +
            (enabled ? "translate-x-5" : "")
          }
        />
      </span>
    </button>
  );
}
