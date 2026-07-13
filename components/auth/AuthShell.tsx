import type { ReactNode } from "react";
import { Mascot, type MascotState } from "../mascot/Mascot";

export type AuthShellProps = {
  /** Pott-Zustand — von der Seite aus Fokus/Eingabe abgeleitet. */
  state: MascotState;
  /** Überschrift der Karte. */
  title: string;
  /** Unterzeile unter der Überschrift. */
  subtitle: ReactNode;
  /** Karteninhalt: Felder, Fortschritt, Absende-Button. */
  children: ReactNode;
  /** Zeile unter der Karte (z. B. Wechsel Login ↔ Registrierung). */
  footer?: ReactNode;
};

/**
 * Geteiltes Bühnenbild der Auth-Seiten: weiche Farbwolken im Hintergrund, das
 * Maskottchen Pott über der Karte, Karte mit Marke + Titel + Unterzeile und dem
 * seitenspezifischen Inhalt. Muss in einem `relative` Container (dem `<form>`)
 * stehen — daran hängen Farbwolken und Maskottchen.
 */
export function AuthShell({
  state,
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <>
      {/* Ambiente: weiche Farbwolken hinter der Karte */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-16 top-12 h-48 w-48 rounded-full bg-accent-surface opacity-60 blur-3xl" />
        <div className="absolute -right-12 bottom-12 h-44 w-44 rounded-full bg-warn-surface opacity-50 blur-3xl" />
      </div>

      <div className="relative mt-16">
        <div
          aria-hidden
          className="absolute -top-20 left-1/2 z-10 h-32 w-32 -translate-x-1/2"
        >
          <Mascot state={state} className="h-full w-full" />
        </div>

        <div className="relative rounded-card border border-line bg-surface px-6 pb-6 pt-16 shadow-sm">
          <div className="mb-5 text-center">
            <p className="flex items-center justify-center gap-1.5 text-sm font-semibold tracking-tight">
              <span className="h-2 w-2 rounded-full bg-accent" />
              OG Recipes
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              {title}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>

      {footer}
    </>
  );
}
