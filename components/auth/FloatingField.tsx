import type { ComponentProps, ReactNode } from "react";

/*
 * Geteiltes Feld-Rezept für die Auth-Seiten (Login + Registrierung): Eingabe mit
 * Floating-Label und teal Fokus-Unterstrich. Einzige Quelle dieser Klassen — beide
 * Seiten bauen ihre Felder daraus.
 */
export const authFieldInput =
  "peer w-full rounded-control border border-line-strong bg-surface px-3.5 pb-2 pt-6 text-base text-ink outline-none transition-colors focus:border-accent";
export const authFieldLabel =
  "pointer-events-none absolute left-3.5 top-2 text-xs font-medium text-ink-subtle transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-accent-ink";
export const authFieldUnderline =
  "pointer-events-none absolute inset-x-3 bottom-0 h-0.5 origin-center scale-x-0 rounded-full bg-accent transition-transform duration-200 peer-focus:scale-x-100";

export type FloatingFieldProps = ComponentProps<"input"> & {
  /** Schwebendes Label (sitzt als Platzhalter, wandert beim Fokus/Füllen nach oben). */
  label: string;
  /** Optionales Element rechts im Feld, z. B. der Auge-Button (siehe PasswordField). */
  trailing?: ReactNode;
};

/** Textfeld mit Floating-Label + Fokus-Unterstrich. Reicht alle Input-Props durch. */
export function FloatingField({
  id,
  label,
  trailing,
  className,
  ...props
}: FloatingFieldProps) {
  return (
    <div className="relative">
      <input
        id={id}
        placeholder=" "
        className={`${authFieldInput}${className ? ` ${className}` : ""}`}
        {...props}
      />
      <label htmlFor={id} className={authFieldLabel}>
        {label}
      </label>
      <span className={authFieldUnderline} />
      {trailing}
    </div>
  );
}
