import { Scale } from "lucide-react";

import { SideMark } from "@/components/lineup/rower-chip";
import type { BoatBalance } from "@/domain/balance";
import { type BoatNumber, type Rigging, type Rower, type Seat, SEATS, seatLabel } from "@/domain/types";
import { cn } from "@/lib/cn";
import { kg } from "@/lib/format";

const STERN_TO_BOW: Seat[] = [...SEATS].reverse();

/** Read-only boat rendering for share and compare screens. */
export function StaticBoat({
  boat,
  name,
  rigging,
  seats,
  balance,
  highlight,
}: {
  boat: BoatNumber;
  name?: string | null;
  rigging: Rigging;
  seats: Map<Seat, Rower | undefined>;
  balance?: BoatBalance;
  highlight?: Set<Seat>;
}) {
  return (
    <section className="rounded-card border border-border bg-bg" aria-label={`Boat ${boat}`}>
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex size-6 items-center justify-center rounded bg-text text-xs font-semibold text-bg">{boat}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{name || `Boat ${boat}`}</span>
      </header>
      <ul className="divide-y divide-border/70">
        {STERN_TO_BOW.map((seat) => {
          const r = seats.get(seat);
          const expected = seat === "cox" ? null : rigging[seat];
          return (
            <li key={seat} className={cn("flex h-9 items-center gap-2 px-3 text-sm", highlight?.has(seat) && "bg-accent-soft")}>
              <span className="w-8 shrink-0 text-xs font-medium text-text-3">{seatLabel(seat)}</span>
              <span className="w-4 shrink-0 text-center text-[10px] text-text-3">{expected ? expected[0].toUpperCase() : ""}</span>
              {r ? (
                <>
                  {r.is_coxswain ? null : <SideMark side={r.side} />}
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  {r.weight_kg != null ? <span className="tabular text-[11px] text-text-3">{r.weight_kg}</span> : null}
                </>
              ) : (
                <span className="text-xs text-text-3">Open</span>
              )}
            </li>
          );
        })}
      </ul>
      {balance ? (
        <footer className="flex items-center gap-3 border-t border-border px-3 py-1.5 text-[11px] text-text-2">
          <span className="inline-flex items-center gap-1 tabular">
            <Scale className="size-3" aria-hidden />
            {kg(balance.total_kg)}
          </span>
          <span className="tabular" title="Port minus starboard">
            P/S {kg(balance.split_kg, { sign: true })}
          </span>
        </footer>
      ) : null}
    </section>
  );
}
