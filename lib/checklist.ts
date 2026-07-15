import { db } from "./db";
import { dayKey } from "./weight";
import { getProfile } from "./profile";
import { WEEKLY_PLAN, KIND_META } from "./training";

export type ChecklistItem = {
  key: string;
  label: string;
  sublabel?: string;
  /** Aus vorhandenen Daten abgeleitet → fester Haken, nicht manuell umschaltbar. */
  auto: boolean;
  done: boolean;
  /** Zielseite, um den Punkt zu erledigen (nur für auto-Items relevant). */
  href?: string;
};

function berlinTodayIndex(): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    weekday: "short",
  }).format(new Date());
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(wd);
}

/**
 * Baut die Heute-Checkliste: ein paar Punkte werden automatisch aus den Daten
 * erkannt (Wiegen), der Rest sind manuelle Haken, deren Status pro Tag in
 * `DailyCheck` gespeichert wird.
 */
export async function getTodayChecklist(userId: number): Promise<{
  items: ChecklistItem[];
  doneCount: number;
  total: number;
  dateKey: Date;
}> {
  const today = dayKey();
  const profile = await getProfile(userId);

  const [weightToday, checks] = await Promise.all([
    db.weightEntry.findUnique({
      where: { userId_date: { userId, date: today } },
    }),
    db.dailyCheck.findMany({ where: { userId, date: today } }),
  ]);

  const checkedKeys = new Set(
    checks.filter((c) => c.checked).map((c) => c.itemKey),
  );

  const todayPlan = WEEKLY_PLAN[berlinTodayIndex()];
  const isRestDay = todayPlan?.kind === "rest";

  const items: ChecklistItem[] = [
    {
      key: "weigh",
      label: "Morgens wiegen",
      sublabel: weightToday
        ? `${weightToday.kg.toFixed(1)} kg eingetragen`
        : "noch nicht eingetragen",
      auto: true,
      done: weightToday != null,
      href: "/weight",
    },
    {
      key: "training",
      label: isRestDay
        ? "Ruhetag — Pause"
        : `Training: ${todayPlan?.title ?? "—"}`,
      sublabel: todayPlan
        ? `${KIND_META[todayPlan.kind].emoji} ${KIND_META[todayPlan.kind].label}${todayPlan.durationMin ? ` · ca. ${todayPlan.durationMin} Min` : ""}`
        : undefined,
      auto: isRestDay,
      done: isRestDay || checkedKeys.has("training"),
      href: "/training",
    },
    {
      key: "kcal",
      label: profile
        ? `Im Kalorienziel bleiben (${profile.kcalTarget} kcal)`
        : "Im Kalorienziel bleiben",
      auto: false,
      done: checkedKeys.has("kcal"),
    },
    {
      key: "protein",
      label: profile
        ? `Eiweiß erreichen (~${profile.proteinG} g)`
        : "Eiweißziel erreichen",
      auto: false,
      done: checkedKeys.has("protein"),
    },
    {
      key: "water",
      label: profile
        ? `Wasser trinken (${(profile.waterMlTarget / 1000).toLocaleString("de-DE")} L)`
        : "Genug Wasser trinken",
      auto: false,
      done: checkedKeys.has("water"),
    },
  ];

  return {
    items,
    doneCount: items.filter((i) => i.done).length,
    total: items.length,
    dateKey: today,
  };
}
