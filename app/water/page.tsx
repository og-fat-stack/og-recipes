import Link from "next/link";
import { getProfile } from "../../lib/profile";
import { getRecentDays, getTodayEntries, getTodayTotal } from "../../lib/water";
import { WaterRing } from "../../components/WaterRing";
import { WaterControls } from "./WaterControls";
import { DeleteEntryButton } from "./DeleteEntryButton";

function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d: Date) {
  return d.toISOString().slice(5, 10);
}

export default async function WaterPage() {
  const profile = await getProfile();
  const target = profile?.waterMlTarget ?? 3000;
  const [total, entries, recent] = await Promise.all([
    getTodayTotal(),
    getTodayEntries(),
    getRecentDays(14),
  ]);

  const maxMl = Math.max(target, ...recent.map((r) => r.totalMl), 1);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Water</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Daily target{" "}
          <span className="font-medium">{(target / 1000).toFixed(1)} L</span>
          {!profile && (
            <>
              {" "}
              — set your <Link href="/profile" className="underline">profile</Link>{" "}
              to personalize.
            </>
          )}
        </p>
      </header>

      <section className="flex flex-col items-center gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
        <WaterRing totalMl={total} targetMl={target} />
        <div className="flex-1 space-y-3 sm:pl-6">
          <div>
            <div className="text-sm text-zinc-500">Today</div>
            <div className="text-3xl font-semibold">
              {total} <span className="text-base font-normal text-zinc-500">ml</span>
            </div>
            <div className="text-sm text-zinc-500">
              {Math.max(0, target - total)} ml to go
            </div>
          </div>
          <WaterControls />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-500">Today&apos;s entries</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing logged yet today.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <span className="text-zinc-500">{fmtTime(e.createdAt)}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">+{e.ml} ml</span>
                  <DeleteEntryButton id={e.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-500">Last 14 days</h2>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-end gap-1 h-32">
            {recent.map((r) => {
              const h = (r.totalMl / maxMl) * 100;
              const hit = r.totalMl >= target;
              return (
                <div
                  key={r.day.getTime()}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${fmtDate(r.day)}: ${r.totalMl} ml`}
                >
                  <div
                    className={
                      "w-full rounded-t " +
                      (hit
                        ? "bg-sky-500"
                        : "bg-sky-300 dark:bg-sky-900")
                    }
                    style={{ height: `${Math.max(h, 2)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs text-zinc-500">
            <span>{fmtDate(recent[0]?.day ?? new Date())}</span>
            <span>{fmtDate(recent[recent.length - 1]?.day ?? new Date())}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
