const TZ = "Europe/Berlin";

const berlinFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function berlinWallClock(d: Date): WallClock {
  const map: Record<string, number> = {};
  for (const p of berlinFormatter.formatToParts(d)) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  if (map.hour === 24) map.hour = 0;
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour,
    minute: map.minute,
    second: map.second,
  };
}

// Build a UTC Date that, when displayed in Berlin, shows (y, m, d, h, min, s).
function fromBerlinWallClock(
  y: number,
  m: number,
  d: number,
  h = 0,
  min = 0,
  s = 0,
): Date {
  const naive = Date.UTC(y, m - 1, d, h, min, s);
  const seen = berlinWallClock(new Date(naive));
  const seenUtc = Date.UTC(
    seen.year,
    seen.month - 1,
    seen.day,
    seen.hour,
    seen.minute,
    seen.second,
  );
  const offset = seenUtc - naive;
  return new Date(naive - offset);
}

/** Berlin-local midnight of the calendar day containing `d`. */
export function startOfDay(d: Date = new Date()): Date {
  const p = berlinWallClock(d);
  return fromBerlinWallClock(p.year, p.month, p.day);
}

/** Berlin-local midnight of Monday of the week containing `d`. */
export function weekStart(d: Date = new Date()): Date {
  const p = berlinWallClock(d);
  const dow = new Date(
    Date.UTC(p.year, p.month - 1, p.day),
  ).getUTCDay(); // 0=Sun..6=Sat
  const offset = dow === 0 ? -6 : 1 - dow;
  return fromBerlinWallClock(p.year, p.month, p.day + offset);
}

/** Berlin-local weekday index of `d`: 0=Mo … 6=So. */
export function berlinWeekdayIndex(d: Date = new Date()): number {
  const p = berlinWallClock(d);
  const dow = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(); // 0=Sun..6=Sat
  return dow === 0 ? 6 : dow - 1;
}

/** Add `n` calendar days in Berlin time (DST-safe). */
export function addDays(d: Date, n: number): Date {
  const p = berlinWallClock(d);
  return fromBerlinWallClock(
    p.year,
    p.month,
    p.day + n,
    p.hour,
    p.minute,
    p.second,
  );
}
