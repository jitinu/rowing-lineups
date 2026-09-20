"use client";

import { useDroppable } from "@dnd-kit/core";
import { Ban, Copy, Megaphone, Scale, TriangleAlert } from "lucide-react";

import type { BoatBalance } from "@/domain/balance";
import { type BoatNumber, type Rigging, type Rower, type Seat, SEATS, seatLabel } from "@/domain/types";
import { type Flag, flagsForSeat } from "@/domain/validation";
import { cn } from "@/lib/cn";
import { kg } from "@/lib/format";

import { RowerChip } from "./rower-chip";

const STERN_TO_BOW: Seat[] = [...SEATS].reverse();

export interface BoatCardProps {
  boat: BoatNumber;
  name: string | null;
  rigging: Rigging;
  seats: Map<Seat, Rower | undefined>;
  flags: Flag[];
  balance: BoatBalance;
  canEdit: boolean;
  selectedRowerId: string | null;
  onSeatClick: (seat: Seat, occupant: Rower | undefined) => void;
  headerExtra?: React.ReactNode;
}

export function BoatCard({ boat, name, rigging, seats, flags, balance, canEdit, selectedRowerId, onSeatClick, headerExtra }: BoatCardProps) {
  const boatFlags = flags.filter((f) => f.boat_number === boat && f.kind !== "empty_seat" && f.kind !== "missing_cox");
  const empties = flags.filter((f) => f.boat_number === boat && f.kind === "empty_seat").length;
  const noCox = flags.some((f) => f.boat_number === boat && f.kind === "missing_cox");
  return (
    <section className="rounded-card border border-border bg-bg" aria-label={`Boat ${boat}`} data-boat={boat}>
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex size-6 items-center justify-center rounded bg-text text-xs font-semibold text-bg">{boat}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{name || `Boat ${boat}`}</span>
        {headerExtra}
      </header>
      <ul className="divide-y divide-border/70">
        {STERN_TO_BOW.map((seat) => {
          const occupant = seats.get(seat);
          const seatFlags = flagsForSeat(flags, boat, seat).filter((f) => f.kind !== "empty_seat" && f.kind !== "missing_cox");
          return (
            <SeatRow
              key={seat}
              boat={boat}
              seat={seat}
              expected={seat === "cox" ? null : rigging[seat]}
              occupant={occupant}
              flags={seatFlags}
              canEdit={canEdit}
              selected={!!occupant && occupant.id === selectedRowerId}
              placing={!!selectedRowerId}
              onClick={() => onSeatClick(seat, occupant)}
            />
          );
        })}
      </ul>
      <footer className="flex items-center gap-3 border-t border-border px-3 py-2 text-xs text-text-2">
        <span className="inline-flex items-center gap-1 tabular" title="Total crew weight (kg)">
          <Scale className="size-3.5" aria-hidden />
          {balance.total_kg > 0 ? kg(balance.total_kg) : "0"}
          {balance.unknown > 0 ? <span className="text-text-3">+{balance.unknown}?</span> : null}
        </span>
        <span className="tabular" title="Port minus starboard (kg)">
          P/S {kg(balance.split_kg, { sign: true })}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {empties > 0 ? <span className="text-text-3">{empties} open</span> : null}
          {noCox ? (
            <span className="inline-flex items-center gap-1 font-medium text-text" title="No cox" data-flag="missing_cox">
              <Megaphone className="size-3.5" aria-hidden />
              No cox
            </span>
          ) : null}
          {boatFlags.length > 0 ? (
            <span className="inline-flex items-center gap-1 font-medium text-text" title={`${boatFlags.length} flags`}>
              <TriangleAlert className="size-3.5" aria-hidden />
              {boatFlags.length}
            </span>
          ) : null}
        </span>
      </footer>
    </section>
  );
}

function SeatRow({
  boat,
  seat,
  expected,
  occupant,
  flags,
  canEdit,
  selected,
  placing,
  onClick,
}: {
  boat: BoatNumber;
  seat: Seat;
  expected: "port" | "starboard" | null;
  occupant: Rower | undefined;
  flags: Flag[];
  canEdit: boolean;
  selected: boolean;
  placing: boolean;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `seat:${boat}:${seat}`, data: { boat, seat }, disabled: !canEdit });
  const mismatch = flags.some((f) => f.kind === "side_mismatch");
  const doubled = flags.some((f) => f.kind === "double_booked");
  const unavailable = flags.some((f) => f.kind === "unavailable");
  return (
    <li
      ref={setNodeRef}
      className={cn("flex items-center gap-2 px-2 py-1", isOver && "bg-surface", placing && canEdit && "cursor-pointer")}
      data-seat={`${boat}:${seat}`}
    >
      <span className="flex w-9 shrink-0 items-baseline gap-1">
        <span className="w-4 text-right text-xs font-semibold text-text-2">{seatLabel(seat)}</span>
        {expected ? <span className="text-[10px] uppercase text-text-3">{expected[0]}</span> : null}
      </span>
      {occupant ? (
        <RowerChip
          rower={occupant}
          dragId={`seat:${boat}:${seat}:${occupant.id}`}
          disabled={!canEdit}
          selected={selected}
          dimmed={unavailable}
          onClick={canEdit ? onClick : undefined}
          className={cn(mismatch && "border-border-strong")}
          trailing={
            <span className="flex items-center gap-1 text-text-2">
              {mismatch ? <TriangleAlert className="size-3.5" aria-label="Side mismatch" /> : null}
              {doubled ? <Copy className="size-3.5" aria-label="In two seats" /> : null}
              {unavailable ? <Ban className="size-3.5" aria-label="Unavailable" /> : null}
            </span>
          }
        />
      ) : (
        <button
          type="button"
          onClick={canEdit ? onClick : undefined}
          disabled={!canEdit}
          className={cn(
            "h-8 flex-1 rounded-md border border-dashed text-left text-xs text-text-3",
            canEdit && placing ? "border-border-strong hover:bg-surface" : "border-border",
          )}
          aria-label={`Empty ${seat} seat, boat ${boat}`}
        />
      )}
    </li>
  );
}
