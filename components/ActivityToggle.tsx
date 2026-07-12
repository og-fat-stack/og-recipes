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
      className="flex w-full items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3 text-left hover:border-line-active disabled:opacity-60"
    >
      <span className="flex flex-col">
        <span className="text-sm font-medium">Aktivität einrechnen</span>
        <span className="text-xs text-ink-subtle">
          {enabled
            ? `Training & Schritte: +${extraKcal} kcal/Tag im Ziel`
            : "Aus — Ziele nur aus dem Grundbedarf (keine Extra-kcal)"}
        </span>
      </span>
      <span
        className={
          "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors " +
          (enabled ? "bg-accent" : "bg-surface-inset")
        }
      >
        <span
          className={
            "h-5 w-5 rounded-full bg-on-accent shadow transition-transform " +
            (enabled ? "translate-x-5" : "")
          }
        />
      </span>
    </button>
  );
}
