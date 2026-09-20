import { ArrowRight, Equal, Minus, Plus, Repeat } from "lucide-react";
import Link from "next/link";

import type { BoatDelta, BoatDiff, Change, LineupDiff, SwapChange } from "@/domain/diff";
import { type Rower, type Seat, seatLabel } from "@/domain/types";
import { cn } from "@/lib/cn";
import { kg, sessionLabel } from "@/lib/format";
import type { LineupSnapshot } from "@/lib/queries";

export function DiffView({ diff, a, b, rowers }: { diff: LineupDiff; a: LineupSnapshot; b: LineupSnapshot; rowers: Rower[] }) {
  const byId = new Map(rowers.map((r) => [r.id, r]));
  const name = (id: string) => byId.get(id)?.name ?? "Unknown";
  const { counts } = diff;

  return (
    <div className="space-y-4" data-testid="diff-view">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-2">
        <LineupRef snap={a} />
        <ArrowRight className="size-3.5 text-text-3" aria-hidden />
        <LineupRef snap={b} />
        <span className="ml-auto flex items-center gap-3 tabular">
          <Count icon={<Repeat className="size-3.5 text-accent" aria-hidden />} n={counts.swaps} label="swaps" />
          <Count icon={<ArrowRight className="size-3.5" aria-hidden />} n={counts.moves} label="moves" />
          <Count icon={<Plus className="size-3.5" aria-hidden />} n={counts.adds} label="in" />
          <Count icon={<Minus className="size-3.5" aria-hidden />} n={counts.drops} label="out" />
        </span>
      </div>

      {diff.identical ? (
        <p className="flex items-center justify-center gap-2 rounded-card border border-dashed border-border py-10 text-sm text-text-2">
          <Equal className="size-4" aria-hidden />
          Identical lineups
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {diff.boats.map((boat) => (
            <BoatDiffCard key={boat.boat_number} boat={boat} name={name} />
          ))}
        </div>
      )}
    </div>
  );
}

function LineupRef({ snap }: { snap: LineupSnapshot }) {
  return (
    <Link href={`/sessions/${snap.session.id}?lineup=${snap.lineup.id}`} className="hover:text-text">
      <span className="font-medium text-text">{sessionLabel(snap.session)}</span> {snap.lineup.name}
    </Link>
  );
}

function Count({ icon, n, label }: { icon: React.ReactNode; n: number; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", n === 0 && "text-text-3")} title={label}>
      {icon}
      {n}
    </span>
  );
}

function BoatDiffCard({ boat, name }: { boat: BoatDiff; name: (id: string) => string }) {
  const unchanged = boat.changes.length === 0;
  return (
    <section className={cn("rounded-card border bg-bg", unchanged ? "border-border/70" : "border-border")} aria-label={`Boat ${boat.boat_number} changes`} data-boat={boat.boat_number}>
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex size-6 items-center justify-center rounded bg-text text-xs font-semibold text-bg">{boat.boat_number}</span>
        <span className="flex-1 text-sm font-medium">Boat {boat.boat_number}</span>
        <Delta delta={boat.delta} />
      </header>
      {unchanged ? (
        <p className="px-3 py-3 text-xs text-text-3">No changes</p>
      ) : (
        <ul className="divide-y divide-border/70">
          {boat.changes.map((c, i) => (
            <li key={i}>
              <ChangeRow change={c} boat={boat.boat_number} name={name} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Delta({ delta }: { delta: BoatDelta }) {
  const total = delta.total_kg;
  const split = delta.split_kg;
  const mismatch = delta.side_mismatches_after - delta.side_mismatches_before;
  return (
    <span className="tabular flex items-center gap-2 text-[11px] text-text-2" title="Total weight and port minus starboard deltas">
      <span className={cn(total === 0 && "text-text-3")}>{total === 0 ? "0" : kg(total, { sign: true })} kg</span>
      <span className={cn(split === 0 && "text-text-3")}>P/S {split === 0 ? "0" : kg(split, { sign: true })}</span>
      {mismatch !== 0 ? <span className={cn(mismatch > 0 ? "text-accent" : "text-text-2")}>{mismatch > 0 ? "+" : ""}{mismatch} side</span> : null}
    </span>
  );
}

function SeatTag({ seat, boat, dim }: { seat: Seat; boat?: number; dim?: boolean }) {
  return (
    <span className={cn("tabular inline-flex h-5 min-w-8 items-center justify-center rounded border px-1 text-[11px] font-medium", dim ? "border-border text-text-3" : "border-border-strong text-text")}>
      {boat != null ? `${boat}:` : ""}
      {seatLabel(seat)}
    </span>
  );
}

function ChangeRow({ change, boat, name }: { change: Change; boat: number; name: (id: string) => string }) {
  switch (change.kind) {
    case "swap":
      return <SwapRow change={change} name={name} />;
    case "move": {
      const cross = change.cross_boat;
      const leaving = cross && change.from.boat_number === boat;
      return (
        <div className="flex items-center gap-2 px-3 py-2 text-sm" data-change="move">
          <ArrowRight className="size-4 shrink-0 text-text-3" aria-label="Move" />
          <span className="min-w-0 flex-1 truncate">{name(change.rower_id)}</span>
          <SeatTag seat={change.from.seat} boat={cross ? change.from.boat_number : undefined} dim />
          <ArrowRight className="size-3 text-text-3" aria-hidden />
          <SeatTag seat={change.to.seat} boat={cross ? change.to.boat_number : undefined} dim={leaving} />
        </div>
      );
    }
    case "add":
      return (
        <div className="flex items-center gap-2 px-3 py-2 text-sm" data-change="add">
          <Plus className="size-4 shrink-0 text-text-3" aria-label="In" />
          <span className="min-w-0 flex-1 truncate">{name(change.rower_id)}</span>
          <SeatTag seat={change.to.seat} />
        </div>
      );
    case "drop":
      return (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-text-2" data-change="drop">
          <Minus className="size-4 shrink-0 text-text-3" aria-label="Out" />
          <span className="min-w-0 flex-1 truncate line-through decoration-border-strong">{name(change.rower_id)}</span>
          <SeatTag seat={change.from.seat} dim />
        </div>
      );
  }
}

function SwapRow({ change, name }: { change: SwapChange; name: (id: string) => string }) {
  return (
    <div className="flex items-stretch gap-2 px-3 py-2 text-sm" data-change="swap">
      <Repeat className="mt-1 size-4 shrink-0 text-accent" aria-label="Swap" />
      <div className="relative flex min-w-0 flex-1 flex-col gap-1">
        <span aria-hidden className="absolute bottom-2.5 left-[-1px] top-2.5 w-px bg-accent" />
        <SwapLine who={name(change.a.rower_id)} from={change.a.from} to={change.a.to} />
        <SwapLine who={name(change.b.rower_id)} from={change.b.from} to={change.b.to} />
      </div>
    </div>
  );
}

function SwapLine({ who, from, to }: { who: string; from: Seat; to: Seat }) {
  return (
    <div className="flex items-center gap-2 pl-3">
      <span className="min-w-0 flex-1 truncate font-medium">{who}</span>
      <SeatTag seat={from} dim />
      <ArrowRight className="size-3 text-accent" aria-hidden />
      <SeatTag seat={to} />
    </div>
  );
}
