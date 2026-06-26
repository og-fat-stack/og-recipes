import Link from "next/link";
import { connection } from "next/server";
import {
  buildShoppingList,
  fmtQty,
  getCurrentPlanWithIngredients,
} from "../../../lib/shopping";
import { ShoppingRow } from "./ShoppingRow";
import { ResetButton } from "./ResetButton";
import { CopyMarkdownButton } from "./CopyMarkdownButton";

export default async function ShoppingPage() {
  await connection();
  const plan = await getCurrentPlanWithIngredients();

  if (!plan) {
    return (
      <div className="space-y-6">
        <header>
          <Link href="/plan" className="text-sm text-zinc-500 hover:underline">
            ← Plan
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Einkaufsliste
          </h1>
        </header>
        <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-zinc-600 dark:text-zinc-400">
            Noch kein Plan für diese Woche. Erstelle zuerst einen auf{" "}
            <Link href="/plan" className="underline">
              /plan
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  const items = buildShoppingList(plan);

  const checkedKeys = new Set(
    plan.shoppingState.filter((s) => s.checked).map((s) => s.itemKey),
  );
  const total = items.length;
  const done = items.filter((i) => checkedKeys.has(i.itemKey)).length;

  const markdown =
    `# Einkaufsliste\n\n` +
    items
      .filter((it) => !checkedKeys.has(it.itemKey))
      .map((it) => {
        const qty = fmtQty(it.qty, it.unit);
        return `- [ ] ${it.name}${qty ? ` — ${qty}` : ""}`;
      })
      .join("\n") +
    "\n";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/plan" className="text-sm text-zinc-500 hover:underline">
            ← Plan
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Einkaufsliste
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {done} von {total} erledigt · aus {new Set(plan.meals.map((m) => m.recipeId)).size}{" "}
            Rezepten der Woche
          </p>
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && <CopyMarkdownButton markdown={markdown} />}
          {total > 0 && <ResetButton planId={plan.id} />}
        </div>
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Keine Zutaten in den Rezepten dieser Woche.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {items.map((it) => (
            <ShoppingRow
              key={it.itemKey}
              planId={plan.id}
              itemKey={it.itemKey}
              label={it.name}
              qty={fmtQty(it.qty, it.unit)}
              sources={it.fromRecipes}
              initialChecked={checkedKeys.has(it.itemKey)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
