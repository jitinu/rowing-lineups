import { Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StaticBoat } from "@/components/lineup/static-boat";
import { Badge, EmptyState } from "@/components/ui";
import { allBoatBalances } from "@/domain/balance";
import { riggingForBoat } from "@/domain/rigging";
import { BOAT_NUMBERS, type BoatNumber, type Rower, type Seat } from "@/domain/types";
import { cn } from "@/lib/cn";
import { formatDateLong, formatTimestamp } from "@/lib/format";
import { getSessionBundle } from "@/lib/queries";

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lineup?: string }>;
}) {
  const [{ id }, { lineup: lineupParam }] = await Promise.all([params, searchParams]);
  const bundle = await getSessionBundle(id);
  if (!bundle) notFound();
  const { session, lineups, rowers } = bundle;
  const active = lineups.find((l) => l.id === lineupParam) ?? lineups.find((l) => l.is_primary) ?? lineups[0] ?? null;
  const assignments = bundle.assignments.filter((a) => a.lineup_id === active?.id);
  const configs = bundle.boatConfigs.filter((c) => c.lineup_id === active?.id);
  const rowerById = new Map(rowers.map((r) => [r.id, r]));
  const balances = allBoatBalances(assignments, rowers, configs);
  const seats = new Map<BoatNumber, Map<Seat, Rower | undefined>>(BOAT_NUMBERS.map((b) => [b, new Map()]));
  for (const a of assignments) seats.get(a.boat_number)?.set(a.seat, rowerById.get(a.rower_id));
  const out = bundle.availability.map((a) => rowerById.get(a.rower_id)).filter((r): r is Rower => !!r);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight">{formatDateLong(session.session_date)}</h1>
        <Badge tone="outline">{session.slot}</Badge>
        {session.title ? <span className="text-base text-text-2">{session.title}</span> : null}
        <Badge className="ml-auto">Read only</Badge>
      </header>

      {lineups.length > 1 ? (
        <nav aria-label="Lineups" className="flex flex-wrap gap-1">
          {lineups.map((l) => (
            <Link
              key={l.id}
              href={`/share/${id}?lineup=${l.id}`}
              aria-current={l.id === active?.id ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm",
                l.id === active?.id ? "border-text bg-text text-bg" : "border-border text-text-2 hover:bg-surface",
              )}
            >
              {l.is_primary ? <Star className={cn("size-3.5", l.id === active?.id ? "fill-bg" : "fill-accent text-accent")} aria-label="Primary" /> : null}
              {l.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {!active ? (
        <EmptyState title="No lineups yet" hint="Check back once a coach has posted one." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BOAT_NUMBERS.map((b) => (
            <StaticBoat
              key={b}
              boat={b}
              name={configs.find((c) => c.boat_number === b)?.name}
              rigging={riggingForBoat(b, configs)}
              seats={seats.get(b)!}
              balance={balances[b - 1]}
            />
          ))}
        </div>
      )}

      {out.length > 0 ? (
        <p className="text-xs text-text-3">
          Out or limited: {out.map((r) => r.name).join(", ")}
        </p>
      ) : null}

      {bundle.notes.length > 0 ? (
        <section aria-label="Coach notes" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bundle.notes.map((n) => (
            <article key={n.id} className="rounded-card border border-border bg-bg p-3">
              <header className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{bundle.coaches.find((c) => c.id === n.coach_id)?.name ?? "Coach"}</span>
                <time className="text-[11px] text-text-3" dateTime={n.updated_at}>{formatTimestamp(n.updated_at)}</time>
              </header>
              <p className="whitespace-pre-wrap text-sm text-text-2">{n.body}</p>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
