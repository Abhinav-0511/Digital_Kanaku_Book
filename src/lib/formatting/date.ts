const IST_TIME_ZONE = "Asia/Kolkata";

const dayFormatter = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: IST_TIME_ZONE,
});

const shortDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: IST_TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: IST_TIME_ZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: IST_TIME_ZONE,
});

/** Today's date as YYYY-MM-DD, in IST — matches the `load_date` column type. */
export function todayIso(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** "Sunday, 6 September 2026" from a YYYY-MM-DD date string. */
export function formatLongDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return dayFormatter.format(date);
}

/** "6 Sep 2026" */
export function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return shortDateFormatter.format(date);
}

/** "10:20 AM" from an ISO timestamp. */
export function formatTime(isoTimestamp: string): string {
  return timeFormatter.format(new Date(isoTimestamp));
}

/** "6 Sep 2026, 10:20 AM" from an ISO timestamp. */
export function formatDateTime(isoTimestamp: string): string {
  return dateTimeFormatter.format(new Date(isoTimestamp));
}

export function isToday(iso: string): boolean {
  return iso === todayIso();
}

/** Monday of the week containing `iso` (or today, if omitted), as YYYY-MM-DD. */
export function startOfWeekIso(iso: string = todayIso()): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diffToMonday);
  return date.toISOString().slice(0, 10);
}

/** First of the month containing `iso` (or today, if omitted), as YYYY-MM-DD. */
export function startOfMonthIso(iso: string = todayIso()): string {
  const [y, m] = iso.split("-").map(Number);
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

export interface DateRangePreset {
  label: string;
  from: string;
  to: string;
}

/** "Today" / "Yesterday" / "This Week" / "This Month" presets for filter panels. */
export function dateRangePresets(): DateRangePreset[] {
  const today = todayIso();
  const yesterday = addDaysIso(today, -1);
  return [
    { label: "Today", from: today, to: today },
    { label: "Yesterday", from: yesterday, to: yesterday },
    { label: "This Week", from: startOfWeekIso(today), to: today },
    { label: "This Month", from: startOfMonthIso(today), to: today },
  ];
}

export function greetingForNow(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: IST_TIME_ZONE }).format(
      new Date(),
    ),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
