import type { ReactNode } from "react";

export type ToggleProps = {
  /** Aktueller Zustand (Serverstatus). */
  enabled: boolean;
  /** Titelzeile links. */
  title: ReactNode;
  /** Beschreibung — nennt die Konsequenz des aktuellen Werts. */
  description: ReactNode;
  /** Umschalten (i. d. R. eine Server-Action in useTransition). */
  onToggle: () => void;
  /** Während der Server-Action: Zeile gesperrt + gedimmt. */
  pending?: boolean;
};

/**
 * Schalter als volle Karten-Zeile: Titel + Beschreibung links, Switch rechts.
 * Für Boolean-Einstellungen, die sofort wirken. Die ganze Zeile ist klickbar
 * (`aria-pressed`). Feature-Schalter (z. B. ActivityToggle, BudgetToggle) sind
 * dünne Wrapper, die Titel/Beschreibung setzen und die Server-Action übergeben.
 */
export function Toggle({
  enabled,
  title,
  description,
  onToggle,
  pending,
}: ToggleProps) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onToggle}
      aria-pressed={enabled}
      className="flex w-full items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3 text-left hover:border-line-active disabled:opacity-60"
    >
      <span className="flex flex-col">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-ink-subtle">{description}</span>
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
