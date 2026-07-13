"use client";

import { useTransition } from "react";
import { toggleActivityEnabled } from "../app/profile/actions";
import { Toggle } from "./Toggle";

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
    <Toggle
      enabled={enabled}
      pending={pending}
      onToggle={() => start(() => toggleActivityEnabled())}
      title="Aktivität einrechnen"
      description={
        enabled
          ? `Training & Schritte: +${extraKcal} kcal/Tag im Ziel`
          : "Aus — Ziele nur aus dem Grundbedarf (keine Extra-kcal)"
      }
    />
  );
}
