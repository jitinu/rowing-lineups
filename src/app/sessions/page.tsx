import { CalendarDays, ChevronRight, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { formatDate, todayIso } from "@/lib/format";
import { listSessionsWithLineups, type SessionWithLineups } from "@/lib/queries";

import { NewSessionButton } from "./new-session";

export const metadata: Metadata = { title: "Sessions" };
export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const [sessions, viewer] = await Promise.all([listSessionsWithLineups(), getViewer()]);
  const today = todayIso();
  const upcoming = sessions.filter((s) => s.session_date >= today).sort((a, b) => a.session_date.localeCompare(b.session_date) || a.slot.localeCompare(b.slot));
  const past = sessions.filter((s) => s.session_date < today);

  return (
    <>
      <PageHeader title="Sessions">{viewer.coach ? <NewSessionButton existing={sessions.map((s) => `${s.session_date}:${s.slot}`)} /> : null}</PageHeader>
      {sessions.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-6" />}
          title="No sessions yet"
          hint={viewer.coach ? "Create the first one to start building lineups." : "Sign in as a coach to create sessions."}
        />
      ) : (
        <div className="space-y-8">
          <Group heading="Upcoming" sessions={upcoming} today={today} />
          <Group heading="Past" sessions={past} today={today} />
        </div>
      )}
    </>
  );
}

function Group({ heading, sessions, today }: { heading: string; sessions: SessionWithLineups[]; today: string }) {
  if (sessions.length === 0) return null;
  const byDate = new Map<string, SessionWithLineups[]>();
  for (const s of sessions) byDate.set(s.session_date, [...(byDate.get(s.session_date) ?? []), s]);
  return (
    <section>
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-3">{heading}</h2>
      <ul className="divide-y divide-border rounded-card border border-border">
        {[...byDate.entries()].map(([date, items]) => (
          <li key={date} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
            <div className="w-36 shrink-0 text-sm font-medium">
              {formatDate(date)}
              {date === today ? <span className="ml-2 text-[11px] font-normal text-accent">Today</span> : null}
            </div>
            <div className="flex flex-1 flex-wrap gap-2">
              {items.map((s) => {
                const primary = s.lineups.find((l) => l.is_primary);
                return (
                  <Link
                    key={s.id}
                    href={`/sessions/${s.id}`}
                    className="group flex min-w-0 flex-1 items-center gap-3 rounded-md border border-border px-3 py-2 hover:bg-surface sm:flex-none sm:min-w-64"
                  >
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-text-2">{s.slot}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{s.title || "Untitled"}</span>
                      <span className="block truncate text-xs text-text-3">
                        {s.lineups.length} {s.lineups.length === 1 ? "lineup" : "lineups"}
                        {primary ? (
                          <>
                            {" "}
                            <Star className="inline size-3 -translate-y-px fill-accent text-accent" aria-label="Primary" /> {primary.name}
                          </>
                        ) : null}
                      </span>
                    </span>
                    <ChevronRight className="size-4 text-text-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
