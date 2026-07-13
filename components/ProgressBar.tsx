export type ProgressBarProps = {
  /** Erreichter Wert. */
  value: number;
  /** Zielwert (100 % Füllung). */
  max?: number;
  /** Höhe: sm = h-1.5 (kompakt, z. B. Tageskarten), md = h-2 (Standard). */
  size?: "sm" | "md";
  /** Zugängliche Beschriftung des Balkens. */
  label?: string;
  /** Zusätzliche Utilities (z. B. Außenabstand). */
  className?: string;
};

const HEIGHT: Record<NonNullable<ProgressBarProps["size"]>, string> = {
  sm: "h-1.5",
  md: "h-2",
};

/**
 * Fortschrittsbalken: Anteil eines Ziels (Tages-Checkliste, kcal-Ziel,
 * Registrierungsschritte …). Track + accent-Füllung, animierte Breite.
 */
export function ProgressBar({
  value,
  max = 100,
  size = "md",
  label,
  className,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      className={`overflow-hidden rounded-full bg-surface-inset ${HEIGHT[size]}${
        className ? ` ${className}` : ""
      }`}
    >
      <div
        className="h-full rounded-full bg-accent transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
