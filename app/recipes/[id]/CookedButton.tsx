"use client";

import { useTransition } from "react";
import { startCookSession } from "../../cook/actions";

export function CookedButton({ recipeId }: { recipeId: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => startCookSession(recipeId).then(() => {}))}
      className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
    >
      {pending ? "..." : "✅ Fertig gekocht"}
    </button>
  );
}
