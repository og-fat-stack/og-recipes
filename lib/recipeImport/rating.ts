/**
 * Bewertung einer Rezeptseite (schema.org `aggregateRating`). Rezepte aus der
 * Web-Suche kommen nur in den Plan, wenn sie gut UND oft genug bewertet sind —
 * ein Schnitt aus 1–4 Stimmen sagt nichts (Palak Tofu: 3,25 ★ aus 4 Stimmen).
 */

export type Rating = {
  /** Auf eine 5-Sterne-Skala umgerechnet. */
  value: number;
  count: number;
};

export const MIN_RATING = 4.0;
export const MIN_RATING_COUNT = 10;

function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v.trim().replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Liest ein `aggregateRating`-Objekt. null, wenn nichts Brauchbares drinsteht. */
export function parseAggregateRating(v: unknown): Rating | null {
  if (Array.isArray(v)) v = v[0];
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  const value = num(o.ratingValue);
  const count = num(o.ratingCount) ?? num(o.reviewCount);
  if (value == null || count == null) return null;
  const best = num(o.bestRating) ?? 5;
  const worst = num(o.worstRating) ?? 1;
  // Unplausible Skalen (z. B. bestRating 1 bei ratingValue 5) als 5er-Skala lesen.
  const scaled = best > worst && value <= best ? (value / best) * 5 : value;
  return { value: Math.round(Math.min(5, Math.max(0, scaled)) * 100) / 100, count: Math.round(count) };
}

/** Gut und oft genug bewertet? Ohne Bewertung: nein. */
export function ratingOk(r: Rating | null | undefined): boolean {
  return !!r && r.value >= MIN_RATING && r.count >= MIN_RATING_COUNT;
}

export function formatRating(r: Rating): string {
  return `${r.value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} ★ (${r.count} Bewertungen)`;
}
