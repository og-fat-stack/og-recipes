/**
 * Like-Quote pro Prompt-Version + Fehlerzahlen — die DIY-Antwort auf
 * "woher weiß ich, ob eine Prompt-Änderung die Rezepte besser gemacht hat?".
 *
 * Ausführen (gegen die Dev-Branch aus .env.local):
 *   npx tsx --env-file=.env.local scripts/promptStats.ts
 *
 * Für aktuelle Zahlen vorher die Dev-Branch auf den Prod-Stand bringen:
 *   npx neonctl branches reset dev --parent --project-id soft-union-73308079
 */
import { db } from "../lib/db";

function pct(n: number, total: number): string {
  return total > 0 ? `${Math.round((n / total) * 100)} %` : "—";
}

async function main() {
  const grouped = await db.recipe.groupBy({
    by: ["promptVersion", "liked"],
    _count: { _all: true },
  });

  type Row = { likes: number; dislikes: number; unrated: number };
  const byVersion = new Map<string, Row>();
  for (const g of grouped) {
    const key = g.promptVersion ?? "(vor Versionierung / manuell)";
    const row = byVersion.get(key) ?? { likes: 0, dislikes: 0, unrated: 0 };
    if (g.liked === true) row.likes += g._count._all;
    else if (g.liked === false) row.dislikes += g._count._all;
    else row.unrated += g._count._all;
    byVersion.set(key, row);
  }

  console.log("\nLike-Quote pro Prompt-Version (Quote = Likes / bewertete Rezepte):\n");
  const versions = [...byVersion.keys()].sort();
  for (const v of versions) {
    const r = byVersion.get(v)!;
    const rated = r.likes + r.dislikes;
    console.log(
      `  ${v.padEnd(32)} 👍 ${String(r.likes).padStart(3)}  👎 ${String(r.dislikes).padStart(3)}  ` +
        `unbewertet ${String(r.unrated).padStart(3)}  → Quote ${pct(r.likes, rated)}`,
    );
  }

  const failures = await db.generationLog.groupBy({
    by: ["promptVersion", "kind"],
    _count: { _all: true },
  });
  if (failures.length > 0) {
    console.log("\nFehlgeschlagene Generierungen (GenerationLog):\n");
    for (const f of failures) {
      console.log(
        `  ${(f.promptVersion ?? "(ohne Version)").padEnd(32)} ${f.kind.padEnd(8)} ${f._count._all}×`,
      );
    }
  } else {
    console.log("\nKeine fehlgeschlagenen Generierungen im Log.");
  }
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
