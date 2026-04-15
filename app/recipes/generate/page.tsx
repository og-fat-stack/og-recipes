import Link from "next/link";
import { GeneratePanel } from "./GeneratePanel";

export default function GenerateRecipePage() {
  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/recipes"
          className="text-sm text-zinc-500 hover:underline"
        >
          ← Rezepte
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Rezept mit Claude generieren
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Beschreibe, was du kochen möchtest — Claude berücksichtigt dein
          Makro-Profil und dass du keine Waage hast.
        </p>
      </header>

      <GeneratePanel />
    </div>
  );
}
