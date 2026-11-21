import Link from "next/link";
import { SearchPanel } from "./SearchPanel";

// Web-Suche + Seitenabruf, beim Übernehmen zusätzlich Übertragung und
// BLS-Nährwertanalyse.
export const maxDuration = 300;

export default function SearchRecipePage() {
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
          Rezept suchen
        </h1>
        <p className="mt-1 text-ink-muted">
          Beschreibe, was du kochen möchtest. Claude sucht echte Rezepte auf
          Rezeptseiten, passend zu deinen Vorgaben. Beim Übernehmen rechnet die
          App die Nährwerte mit dem Bundeslebensmittelschlüssel nach.
        </p>
      </header>

      <SearchPanel />
    </div>
  );
}
