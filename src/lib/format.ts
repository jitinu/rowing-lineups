import type { Session } from "@/domain/types";

/** Parse a `YYYY-MM-DD` date as local time (avoids the UTC shift of `new Date(iso)`). */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) {
  return parseDate(iso).toLocaleDateString(undefined, opts);
}

export function formatDateLong(iso: string) {
  return formatDate(iso, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function sessionLabel(s: Pick<Session, "session_date" | "slot">) {
  return `${formatDate(s.session_date)} ${s.slot}`;
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function kg(n: number, opts: { sign?: boolean } = {}) {
  const s = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return opts.sign && n > 0 ? `+${s}` : s;
}

/** Class of 2027 renders as '27. */
export function classYearLabel(year: number) {
  return `'${String(year).slice(-2)}`;
}
