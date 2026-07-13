"use client";

import dynamic from "next/dynamic";
import type { MascotState } from "./types";

// Lottie ist client-only (lottie-web fasst window/document an) → per next/dynamic
// ohne SSR laden.
const LottieMascot = dynamic(
  () => import("./LottieMascot").then((m) => m.LottieMascot),
  { ssr: false },
);

export type { MascotState };

export type MascotProps = {
  state?: MascotState;
  warmth?: 0 | 1 | 2;
  className?: string;
  title?: string;
};

/**
 * Öffentliche Maskottchen-Komponente "Pott" (Lottie). Gleiche API überall;
 * aufrufender Code (z. B. die Login-Seite) kennt nur diese Komponente.
 */
export function Mascot(props: MascotProps) {
  return <LottieMascot {...props} />;
}
