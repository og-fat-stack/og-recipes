import type { Sex } from "./macros";

export type BandStatus = "green" | "amber" | "red";

export type WaistInput = { waistCm: number; sex: Sex };
export type WhrInput = { waistCm: number; hipCm: number; sex: Sex };
export type WhtrInput = { waistCm: number; heightCm: number };
export type BfInput = { bodyFatPct: number; sex: Sex };

export const WAIST_TARGET = {
  male: { greenMax: 94, amberMax: 102 },
  female: { greenMax: 80, amberMax: 88 },
} as const;

export const WHTR_TARGET = {
  greenMin: 0.4,
  greenMax: 0.5,
  amberMax: 0.6,
} as const;

export const WHR_TARGET = {
  male: { greenMax: 0.9, amberMax: 0.99 },
  female: { greenMax: 0.85, amberMax: 0.89 },
} as const;

// Soft "ideal" body-fat band used for chips, prompt, and ideal-weight derivation.
// Wider amber zones extend below the green band so that being too lean still
// flags. Sources: ACE body-fat categories.
export const BF_TARGET = {
  male: { greenMin: 10, greenMax: 18, amberMinLow: 6, amberMaxHigh: 24 },
  female: { greenMin: 18, greenMax: 25, amberMinLow: 14, amberMaxHigh: 31 },
} as const;

export function whr(waistCm: number, hipCm: number): number {
  return waistCm / hipCm;
}

export function whtr(waistCm: number, heightCm: number): number {
  return waistCm / heightCm;
}

export function leanMassKg(weightKg: number, bodyFatPct: number): number {
  return weightKg * (1 - bodyFatPct / 100);
}

/**
 * Personalised "ideal weight" band derived from current lean mass + the
 * healthy body-fat band for the user's sex. Replaces BMI-based weight tables.
 */
export function idealWeightBandKg(input: {
  weightKg: number;
  bodyFatPct: number;
  sex: Sex;
}): { minKg: number; maxKg: number } {
  const lean = leanMassKg(input.weightKg, input.bodyFatPct);
  const t = BF_TARGET[input.sex];
  return {
    minKg: lean / (1 - t.greenMin / 100),
    maxKg: lean / (1 - t.greenMax / 100),
  };
}

/**
 * US Navy body-fat estimate. Uses cm + log10. Hip is required for women,
 * ignored for men. Returns a percentage; clamps to [3, 60] to match form bounds.
 */
export function usNavyBodyFatPct(input: {
  heightCm: number;
  neckCm: number;
  waistCm: number;
  hipCm?: number;
  sex: Sex;
}): number {
  const { heightCm, neckCm, waistCm, hipCm, sex } = input;
  const log10 = (x: number) => Math.log10(x);
  let raw: number;
  if (sex === "male") {
    raw =
      495 /
        (1.0324 -
          0.19077 * log10(waistCm - neckCm) +
          0.15456 * log10(heightCm)) -
      450;
  } else {
    if (hipCm == null) return NaN;
    raw =
      495 /
        (1.29579 -
          0.35004 * log10(waistCm + hipCm - neckCm) +
          0.221 * log10(heightCm)) -
      450;
  }
  return Math.max(3, Math.min(60, raw));
}

export function waistStatus({ waistCm, sex }: WaistInput): BandStatus {
  const t = WAIST_TARGET[sex];
  if (waistCm < t.greenMax) return "green";
  if (waistCm <= t.amberMax) return "amber";
  return "red";
}

export function whtrStatus({ waistCm, heightCm }: WhtrInput): BandStatus {
  const v = whtr(waistCm, heightCm);
  if (v < WHTR_TARGET.greenMin) return "amber";
  if (v <= WHTR_TARGET.greenMax) return "green";
  if (v <= WHTR_TARGET.amberMax) return "amber";
  return "red";
}

export function whrStatus({ waistCm, hipCm, sex }: WhrInput): BandStatus {
  const v = whr(waistCm, hipCm);
  const t = WHR_TARGET[sex];
  if (v <= t.greenMax) return "green";
  if (v <= t.amberMax) return "amber";
  return "red";
}

export function bodyFatStatus({ bodyFatPct, sex }: BfInput): BandStatus {
  const t = BF_TARGET[sex];
  if (bodyFatPct >= t.greenMin && bodyFatPct <= t.greenMax) return "green";
  if (bodyFatPct >= t.amberMinLow && bodyFatPct <= t.amberMaxHigh) return "amber";
  return "red";
}

const STATUS_DE: Record<BandStatus, string> = {
  green: "im Zielbereich",
  amber: "leicht außerhalb",
  red: "deutlich außerhalb",
};

function fmt(n: number, digits = 0): string {
  return n.toFixed(digits).replace(".", ",");
}

/**
 * German prompt block describing the user's current body composition vs. their
 * soft band. Returns null when no measurement value is available. Appended to
 * the planner user message — never to the cached system prompt.
 */
export function compositionSummaryForPrompt(input: {
  waistCm?: number | null;
  hipCm?: number | null;
  bodyFatPct?: number | null;
  heightCm: number;
  weightKg: number;
  sex: Sex;
}): string | null {
  const lines: string[] = [];

  if (input.waistCm != null) {
    const s = waistStatus({ waistCm: input.waistCm, sex: input.sex });
    const t = WAIST_TARGET[input.sex];
    lines.push(
      `- Taille ${fmt(input.waistCm, 1)} cm (Zielband < ${t.greenMax} cm) — ${STATUS_DE[s]}`,
    );

    const w = whtr(input.waistCm, input.heightCm);
    const ws = whtrStatus({ waistCm: input.waistCm, heightCm: input.heightCm });
    lines.push(
      `- WHtR ${fmt(w, 2)} (Zielband ${fmt(WHTR_TARGET.greenMin, 2)}–${fmt(WHTR_TARGET.greenMax, 2)}) — ${STATUS_DE[ws]}`,
    );

    if (input.hipCm != null) {
      const r = whr(input.waistCm, input.hipCm);
      const rs = whrStatus({
        waistCm: input.waistCm,
        hipCm: input.hipCm,
        sex: input.sex,
      });
      const rt = WHR_TARGET[input.sex];
      lines.push(
        `- WHR ${fmt(r, 2)} (Ziel ≤ ${fmt(rt.greenMax, 2)}) — ${STATUS_DE[rs]}`,
      );
    }
  }

  if (input.bodyFatPct != null) {
    const s = bodyFatStatus({
      bodyFatPct: input.bodyFatPct,
      sex: input.sex,
    });
    const t = BF_TARGET[input.sex];
    lines.push(
      `- KFA ${fmt(input.bodyFatPct, 1)} % (Zielband ${t.greenMin}–${t.greenMax} %) — ${STATUS_DE[s]}`,
    );
    const lean = leanMassKg(input.weightKg, input.bodyFatPct);
    lines.push(
      `- Magermasse: ${fmt(lean, 1)} kg → Proteinbedarf bereits in Tagesziel berücksichtigt`,
    );
  }

  if (lines.length === 0) return null;

  return `Körperkomposition (für Empfehlungs-Bias, KEIN harter Filter):
${lines.join("\n")}
Bevorzuge Rezepte, die helfen, die Körperkomposition Richtung Zielband zu verschieben (proteinreich, sättigend, ballaststoffreich, moderate Energiedichte). Schließe keine Lebensmittel aus — biase nur die Auswahl.`;
}

/** Convenience: status for any metric the UI wants to colour. */
export function bandStatus(
  metric: "waist" | "whtr" | "whr" | "bf",
  value: number,
  sex: Sex,
  extra?: { hipCm?: number; heightCm?: number },
): BandStatus {
  switch (metric) {
    case "waist":
      return waistStatus({ waistCm: value, sex });
    case "whtr":
      if (extra?.heightCm == null)
        throw new Error("bandStatus(whtr) needs heightCm");
      return whtrStatus({ waistCm: value, heightCm: extra.heightCm });
    case "whr":
      if (extra?.hipCm == null)
        throw new Error("bandStatus(whr) needs hipCm");
      return whrStatus({ waistCm: value, hipCm: extra.hipCm, sex });
    case "bf":
      return bodyFatStatus({ bodyFatPct: value, sex });
  }
}
