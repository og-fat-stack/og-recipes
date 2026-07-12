import Link from "next/link";
import { connection } from "next/server";
import {
  buildShoppingList,
  fmtQty,
  getPlanWithIngredientsForWeek,
} from "../../../lib/shopping";
import { parseWeekSel } from "../../../lib/plan";
import { requireUserId } from "../../../lib/auth";
import { ShoppingRow } from "./ShoppingRow";
import { ResetButton } from "./ResetButton";
import { CopyMarkdownButton } from "./CopyMarkdownButton";

export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await connection();
  const userId = await requireUserId();
  const week = parseWeekSel((await searchParams).week);
  const planHref = week === "next" ? "/plan?week=next" : "/plan";
  const plan = await getPlanWithIngredientsForWeek(userId, week);

  if (!plan) {
    return (
      <div className="space-y-6">
        <header>
          <Link href={planHref} className="text-sm text-ink-subtle hover:underline">
            ← Plan
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Einkaufsliste
          </h1>
        </header>
        <div className="rounded-card border border-dashed border-line-strong p-8 text-center">
          <p className="text-ink-muted">
            Noch kein Plan für {week === "next" ? "nächste" : "diese"} Woche.
            Erstelle zuerst einen auf{" "}
            <Link href={planHref} className="underline">
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
          <Link href={planHref} className="text-sm text-ink-subtle hover:underline">
            ← Plan
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Einkaufsliste
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
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
        <p className="text-sm text-ink-subtle">
          Keine Zutaten in den Rezepten dieser Woche.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line">
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
