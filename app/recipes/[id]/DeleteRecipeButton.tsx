"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteRecipe } from "../actions";

export function DeleteRecipeButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Rezept wirklich löschen?")) return;
        start(async () => {
          await deleteRecipe(id);
          router.push("/recipes");
        });
      }}
      className="rounded-full border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950/30"
    >
      {pending ? "Löschen..." : "Löschen"}
    </button>
  );
}
