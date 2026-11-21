import Link from "next/link";
import { connection } from "next/server";
import {
  DAYS,
  DISPLAY_SLOTS,
  SLOT_LABELS,
  type Slot,
  addDays,
  getPlanForWeek,
  getPlanGeneration,
  isSnackSlot,
  parseWeekSel,
  weekStartFor,
} from "../../lib/plan";
import { berlinWeekdayIndex } from "../../lib/time";
import { requireUserId } from "../../lib/auth";
import { getProfile } from "../../lib/profile";
import { ProgressBar } from "../../components/ProgressBar";
import { isSideSlot } from "../../lib/sides";
import { GeneratePlanButton } from "./GeneratePlanButton";

// "Woche generieren" läuft als Server-Action dieser Seite im Hintergrund
// weiter (after()): Web-Suche, Seitenabruf, Übertragung, BLS, Auswahl.
export const maxDuration = 300;

const WEEK_TABS = [
  { sel: "this" as const, label: "Diese Woche", href: "/plan" },
  { sel: "next" as const, label: "Nächste Woche", href: "/plan?week=next" },
];

const FULL_DAYS = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
] as const;

const SLOT_ICON: Record<Slot, string> = {
  breakfast: "🌅",
  snack1: "🥤",
  lunch: "☀️",
  snack2: "🥤",
  dinner: "🌙",
};

type Cell = {
  recipeId: number;
  title: string;
  /** Portionen für diese Mahlzeit (die App passt sie an die Tagesziele an). */
  factor: number;
  /** Portionen dieses Rezepts im ganzen Plan — fürs Kochen/Einkaufen. */
  planPortions: number;
  /** Makros dieser Mahlzeit (Portion × Faktor). */
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  side?: { title: string; kcal: number; protein: number; carb: number; fat: number };
};

function fmtPortions(n: number): string {
  return n.toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await connection();
  const userId = await requireUserId();
  const week = parseWeekSel((await searchParams).week);
  const ws = weekStartFor(week);
  const [profile, plan, generation] = await Promise.all([
    getProfile(userId),
    getPlanForWeek(userId, ws),
    getPlanGeneration(userId, ws),
  ]);
  const todayIdx = week === "this" ? berlinWeekdayIndex() : -1;
  const isGenerating = generation?.status === "generating";

  // Belegung je (Tag, Slot).
  const grid = new Map<string, Cell>();
  if (plan) {
    const portionsByRecipe = new Map<number, number>();
    for (const m of plan.meals)
      portionsByRecipe.set(m.recipeId, (portionsByRecipe.get(m.recipeId) ?? 0) + m.portionsFromBatch);
    const scaled = (m: (typeof plan.meals)[number]) => ({
      kcal: Math.round(m.recipe.kcalPerPortion * m.portionsFromBatch),
      protein: Math.round(m.recipe.proteinG * m.portionsFromBatch),
      carb: Math.round(m.recipe.carbG * m.portionsFromBatch),
      fat: Math.round(m.recipe.fatG * m.portionsFromBatch),
    });
    for (const m of plan.meals) {
      if (isSideSlot(m.slot)) continue;
      grid.set(`${m.day}-${m.slot}`, {
        recipeId: m.recipeId,
        title: m.recipe.title,
        factor: m.portionsFromBatch,
        planPortions: portionsByRecipe.get(m.recipeId) ?? 1,
        ...scaled(m),
      });
    }
    // Beilagen hängen an ihrer Mahlzeit ("lunch_side" → "lunch").
    for (const m of plan.meals) {
      if (!isSideSlot(m.slot)) continue;
      const cell = grid.get(`${m.day}-${m.slot.replace(/_side$/, "")}`);
      if (!cell) continue;
      const units = m.portionsFromBatch;
      cell.side = {
        title: units === 1 ? m.recipe.title : `${fmtPortions(units)} × ${m.recipe.title}`,
        ...scaled(m),
      };
    }
  }

  // Kochtage: ein Tag ist ein Kochtag, wenn hier ein NEUES Hauptmahl-Rezept
  // startet (aus den Daten abgeleitet — den Rhythmus wählt Claude pro Woche).
  const cookDays = new Set<number>();
  let lastMain: number | null = null;
  for (let day = 0; day < 7; day++) {
    const main = grid.get(`${day}-lunch`) ?? grid.get(`${day}-dinner`);
    if (main && main.recipeId !== lastMain) {
      cookDays.add(day);
      lastMain = main.recipeId;
    }
  }

  const target = profile?.kcalTarget ?? 0;
  const plannedCount = grid.size;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Wochenplan</h1>
          <p className="mt-1 text-ink-muted">
            Woche vom {fmtDate(ws)} bis {fmtDate(addDays(ws, 6))}
            {plan && plannedCount > 0 && ` · ${plannedCount} Mahlzeiten geplant`}
            .
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {plan && (
            <Link
              href={
                week === "next" ? "/plan/shopping?week=next" : "/plan/shopping"
              }
              className="flex items-center justify-center gap-1 whitespace-nowrap rounded-full border border-line-strong px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-subtle"
            >
              🛒 Einkaufsliste
            </Link>
          )}
          {profile && (
            <GeneratePlanButton
              hasPlan={!!plan}
              week={week}
              minDay={todayIdx < 0 ? 0 : todayIdx}
              generating={isGenerating}
            />
          )}
        </div>
      </header>

      <div className="inline-flex rounded-full border border-line p-1">
        {WEEK_TABS.map((t) => {
          const active = t.sel === week;
          return (
            <Link
              key={t.sel}
              href={t.href}
              className={
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
                (active
                  ? "bg-contrast text-on-contrast"
                  : "text-ink-muted hover:text-ink")
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {!profile && (
        <div className="rounded-card border border-dashed border-line-strong p-4 text-sm">
          Zuerst{" "}
          <Link href="/profile" className="underline">
            Profil
          </Link>{" "}
          ausfüllen, damit die App die Portionen an deine Ziele anpassen kann.
        </div>
      )}

      {isGenerating && (
        <div className="flex items-center gap-3 rounded-card bg-accent-surface px-4 py-3 text-sm text-accent-surface-ink">
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-surface-inset border-t-accent-surface-ink"
          />
          <p>
            Claude sucht passende Rezepte und plant im Hintergrund — du kannst
            die App in der Zwischenzeit ganz normal nutzen. Diese Seite aktualisiert sich von
            selbst, sobald der Plan fertig ist.
          </p>
        </div>
      )}

      {!isGenerating && generation?.status === "error" && (
        <div className="rounded-card border border-danger-line bg-danger-surface px-4 py-3 text-sm text-danger-surface-ink">
          <p className="font-medium">Die letzte Generierung ist fehlgeschlagen.</p>
          <p className="mt-0.5">
            {generation.error ?? "Unbekannter Fehler."} — einfach nochmal auf
            „Neu generieren“ klicken.
          </p>
        </div>
      )}

      {profile && !plan && !isGenerating && (
        <div className="rounded-card border border-dashed border-line-strong p-8 text-center">
          <p className="text-ink-muted">
            Noch kein Plan für {week === "next" ? "nächste" : "diese"} Woche.
            Klick oben auf „Woche generieren“.
          </p>
        </div>
      )}

      {plan && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DAYS.map((_, day) => (
            <DayCard
              key={day}
              label={FULL_DAYS[day]}
              dateStr={fmtDate(addDays(ws, day))}
              meals={DISPLAY_SLOTS.map((slot) => ({
                slot,
                cell: grid.get(`${day}-${slot}`),
              })).filter(
                // Snack-Slots nur zeigen, wenn belegt — je nach Eiweißziel
                // gibt es 0–2 davon; leere "noch offen"-Zeilen wären Rauschen.
                (m) => m.cell || !isSnackSlot(m.slot),
              )}
              target={target}
              isToday={day === todayIdx}
              isPast={todayIdx >= 0 && day < todayIdx}
              isCookDay={cookDays.has(day)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DayCard({
  label,
  dateStr,
  meals,
  target,
  isToday,
  isPast,
  isCookDay,
}: {
  label: string;
  dateStr: string;
  meals: { slot: Slot; cell?: Cell }[];
  target: number;
  isToday: boolean;
  isPast: boolean;
  isCookDay: boolean;
}) {
  const sum = (k: "kcal" | "protein" | "carb" | "fat") =>
    meals.reduce((s, m) => s + (m.cell?.[k] ?? 0) + (m.cell?.side?.[k] ?? 0), 0);
  const kcal = sum("kcal");
  const protein = sum("protein");
  const carb = sum("carb");
  const fat = sum("fat");
  const hasAny = meals.some((m) => m.cell);

  return (
    <section
      className={
        "rounded-card border bg-surface p-4 transition-colors " +
        (isToday
          ? "border-accent ring-1 ring-accent"
          : "border-line") +
        (isPast ? " opacity-60" : "")
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight">{label}</h2>
          <span className="text-xs text-ink-subtle">{dateStr}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isCookDay && (
            <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] font-medium text-ink-muted">
              🍳 Kochtag
            </span>
          )}
          {isToday && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-on-accent">
              Heute
            </span>
          )}
        </div>
      </div>

      {hasAny && kcal > 0 && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-ink-muted">
              {protein} E · {carb} K · {fat} F
            </span>
            <span className="font-semibold tabular-nums">
              {kcal}
              {target > 0 && (
                <span className="font-normal text-ink-subtle">
                  {" "}
                  / {target} kcal
                </span>
              )}
            </span>
          </div>
          {target > 0 && (
            <ProgressBar
              value={kcal}
              max={target}
              size="sm"
              label={`${kcal} von ${target} kcal`}
              className="mt-1.5"
            />
          )}
        </div>
      )}

      {hasAny ? (
        <div className="mt-3 space-y-1">
          {meals.map(({ slot, cell }) =>
            cell ? (
              <div key={slot}>
                <Link
                  href={`/recipes/${cell.recipeId}?portionen=${cell.planPortions}`}
                  className="flex items-center gap-3 rounded-control px-2 py-2 transition-colors hover:bg-surface-hover"
                >
                  <span aria-hidden className="text-lg leading-none">
                    {SLOT_ICON[slot]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
                      {SLOT_LABELS[slot]}
                      {cell.factor !== 1 && ` · ${fmtPortions(cell.factor)} Portionen`}
                    </span>
                    <span className="block truncate text-sm font-medium">
                      {cell.title}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-ink-subtle">
                    <span className="block font-medium text-ink-muted">
                      {cell.kcal} kcal
                    </span>
                    <span className="block">{cell.protein} g E</span>
                  </span>
                </Link>
                {cell.side && (
                  <div className="flex items-center gap-3 px-2 pb-2 text-xs text-ink-subtle">
                    <span aria-hidden className="w-[1.125rem] text-center">+</span>
                    <span className="min-w-0 flex-1 truncate">
                      Beilage: {cell.side.title}
                    </span>
                    <span className="shrink-0 text-right">
                      {cell.side.kcal} kcal · {cell.side.protein} g E
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div
                key={slot}
                className="flex items-center gap-3 rounded-control px-2 py-2"
              >
                <span aria-hidden className="text-lg leading-none opacity-30">
                  {SLOT_ICON[slot]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
                    {SLOT_LABELS[slot]}
                  </span>
                  <span className="block text-sm text-ink-subtle">
                    — noch offen
                  </span>
                </span>
              </div>
            ),
          )}
        </div>
      ) : (
        <p className="mt-3 rounded-control bg-surface-subtle px-3 py-4 text-center text-sm text-ink-subtle">
          Diese Woche nicht verplant
        </p>
      )}
    </section>
  );
}
