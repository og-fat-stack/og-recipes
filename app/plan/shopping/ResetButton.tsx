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
      className="rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-subtle disabled:opacity-50"
    >
      {pending ? "..." : "Alle zurücksetzen"}
    </button>
  );
}
