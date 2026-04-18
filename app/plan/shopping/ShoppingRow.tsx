"use client";

import { useOptimistic, useTransition } from "react";
import { toggleShoppingItem } from "./actions";

export function ShoppingRow({
  planId,
  itemKey,
  label,
  qty,
  sources,
  initialChecked,
}: {
  planId: number;
  itemKey: string;
  label: string;
  qty: string;
  sources: string[];
  initialChecked: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(
    initialChecked,
    (_, next: boolean) => next,
  );
  const [, start] = useTransition();

  return (
    <li className="flex items-start gap-3 px-4 py-2 text-sm">
      <input
        type="checkbox"
        checked={optimistic}
        onChange={(e) => {
          const next = e.target.checked;
          start(() => {
            setOptimistic(next);
            void toggleShoppingItem(planId, itemKey, next);
          });
        }}
        className="mt-1 h-4 w-4 accent-emerald-600"
      />
      <div className="flex-1">
        <div
          className={
            "flex items-baseline justify-between gap-3 " +
            (optimistic ? "text-zinc-400 line-through" : "")
          }
        >
          <span>{label}</span>
          {qty && <span className="text-zinc-500">{qty}</span>}
        </div>
        {sources.length > 0 && (
          <div className="text-xs text-zinc-500">
            {sources.join(" · ")}
          </div>
        )}
      </div>
    </li>
  );
}
