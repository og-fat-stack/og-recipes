import Link from "next/link";
import { ImportPanel } from "./ImportPanel";

// Seite laden + Claude-Übertragung + BLS-Nährwertanalyse brauchen zusammen
// deutlich länger als ein normaler Request.
export const maxDuration = 300;

export default function ImportRecipePage() {
  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/recipes"
          className="text-sm text-ink-subtle hover:underline"
        >
          ← Rezepte
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Rezept aus Link importieren
        </h1>
        <p className="mt-1 text-ink-muted">
          Füge den Link zu einem Rezept ein, z. B. von EatSmarter, Lecker oder
          einem Food-Blog. Das Rezept bleibt unverändert, mit exakten Mengen in
          Gramm und Milliliter. Die Nährwerte kommen aus dem
          Bundeslebensmittelschlüssel.
        </p>
      </header>

      <ImportPanel />
    </div>
  );
}
