import { Scale } from "lucide-react";

import type { BoatBalance } from "@/domain/balance";
import { type BoatNumber, type Rigging, type Rower, type Seat, seatLabel } from "@/domain/types";
import { cn } from "@/lib/cn";
import { kg } from "@/lib/format";

import { BOW_TO_STERN, HullHeader, HullRow, Oar } from "./hull";
import { SideMark } from "./rower-chip";

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
      <HullHeader />
      <ul className="pb-1">
        {BOW_TO_STERN.map((seat) => {
          const r = seats.get(seat);
          const expected = seat === "cox" ? null : rigging[seat];
          const mismatch = !!r && !!expected && r.side !== "both" && r.side !== expected;
          const oar = expected ? <Oar side={expected} mismatch={mismatch} label={`${seatLabel(seat)} rigged ${expected}`} /> : null;
          return (
            <HullRow
              key={seat}
              seat={seat}
              port={expected === "port" ? oar : null}
              starboard={expected === "starboard" ? oar : null}
              cellClassName={cn("h-9 text-sm", highlight?.has(seat) && "bg-accent-soft")}
            >
              <span className={cn("w-4 shrink-0 text-center text-xs font-semibold tabular", seat === "cox" ? "text-text-3" : "text-text-2")}>
                {seat === "cox" ? "C" : seatLabel(seat)}
              </span>
              {r ? (
                <>
                  {r.is_coxswain ? null : <SideMark side={r.side} />}
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  {r.weight_kg != null ? <span className="tabular text-[11px] text-text-3">{r.weight_kg}</span> : null}
                </>
              ) : (
                <span className="text-xs text-text-3">Open</span>
              )}
            </HullRow>
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
