import Link from "next/link";
import { RecipeForm } from "./RecipeForm";

export default function NewRecipePage() {
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
          Neues Rezept
        </h1>
      </header>
      <RecipeForm />
    </div>
  );
}
