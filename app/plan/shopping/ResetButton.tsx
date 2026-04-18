"use client";

import { useTransition } from "react";
import { resetShoppingList } from "./actions";

export function ResetButton({ planId }: { planId: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Alle Häkchen zurücksetzen?")) return;
        start(() => resetShoppingList(planId).then(() => {}));
      }}
      className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
    >
      {pending ? "..." : "Alle zurücksetzen"}
    </button>
  );
}
