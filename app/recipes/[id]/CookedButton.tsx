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
      className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
    >
      {pending ? "..." : "✅ Fertig gekocht"}
    </button>
  );
}
