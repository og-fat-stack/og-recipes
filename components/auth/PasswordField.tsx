import type { ComponentProps } from "react";
import { FloatingField } from "./FloatingField";

export type PasswordFieldProps = Omit<ComponentProps<"input">, "type"> & {
  /** Passwort im Klartext zeigen. Wird vom Aufrufer gehalten (steuert auch Pott). */
  reveal: boolean;
  /** Klick auf den Auge-Button. */
  onToggleReveal: () => void;
  label?: string;
};

/**
 * Passwortfeld mit Auge-Button. `reveal` ist bewusst kontrolliert: die Auth-Seiten
 * spiegeln ihn ins Maskottchen (peeking ↔ peekingOpen). Der Button hält per
 * mousedown-preventDefault den Fokus im Feld, sonst verlässt Pott die peeking-Pose.
 */
export function PasswordField({
  reveal,
  onToggleReveal,
  label = "Passwort",
  className,
  ...props
}: PasswordFieldProps) {
  return (
    <FloatingField
      label={label}
      type={reveal ? "text" : "password"}
      className={`pr-11${className ? ` ${className}` : ""}`}
      trailing={
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggleReveal}
          aria-label={reveal ? "Passwort verbergen" : "Passwort anzeigen"}
          className="absolute inset-y-0 right-0 z-10 flex items-center px-3.5 text-ink-subtle outline-none transition-colors hover:text-ink-muted focus-visible:text-ink-muted"
        >
          <EyeIcon off={reveal} />
        </button>
      }
      {...props}
    />
  );
}

/** Auge-Icon; bei `off` durchgestrichen (Passwort sichtbar). */
export function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off ? <line x1="3" y1="3" x2="21" y2="21" /> : null}
    </svg>
  );
}
