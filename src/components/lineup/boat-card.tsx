"use client";

import { useDroppable } from "@dnd-kit/core";
import { ArrowLeftRight, Ban, Copy, Megaphone, RotateCcw, Scale, TriangleAlert, UserRound, Wrench } from "lucide-react";

import { AnchoredMenu } from "@/components/menu";
import type { BoatBalance } from "@/domain/balance";
import { type BoatNumber, type Rigging, type Rower, type Seat, type Side, STANDARD_RIGGING, seatLabel } from "@/domain/types";
import { type Flag, flagsForSeat } from "@/domain/validation";
import { cn } from "@/lib/cn";
import { kg } from "@/lib/format";

import { BOW_TO_STERN, HullHeader, HullRow, Oar, OarSlot, otherSide, type RigSide } from "./hull";
import { RowerChip } from "./rower-chip";

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
  /** Re-rig one seat, or the whole boat when `rigging` is passed. `null` restores the standard rig. */
  onRig?: (rigging: Rigging | null) => void;
  /** Change a rower's own side (a roster edit, not a lineup edit). */
  onRowerSide?: (rower: Rower, side: Side) => void;
  headerExtra?: React.ReactNode;
}

function isStandard(rigging: Rigging) {
  return BOW_TO_STERN.every((s) => s === "cox" || rigging[s] === STANDARD_RIGGING[s]);
}

export function BoatCard({
  boat,
  name,
  rigging,
  seats,
  flags,
  balance,
  canEdit,
  selectedRowerId,
  onSeatClick,
  onRig,
  onRowerSide,
  headerExtra,
}: BoatCardProps) {
  const boatFlags = flags.filter((f) => f.boat_number === boat && f.kind !== "empty_seat" && f.kind !== "missing_cox");
  const empties = flags.filter((f) => f.boat_number === boat && f.kind === "empty_seat").length;
  const noCox = flags.some((f) => f.boat_number === boat && f.kind === "missing_cox");
  const standard = isStandard(rigging);
  const rigSeat = (seat: Exclude<Seat, "cox">, side: RigSide) => onRig?.({ ...rigging, [seat]: side });
  const flipAll = () => {
    const next = { ...rigging };
    for (const s of BOW_TO_STERN) if (s !== "cox") next[s] = otherSide(rigging[s]);
    onRig?.(next);
  };

  return (
    <section className="rounded-card border border-border bg-bg" aria-label={`Boat ${boat}`} data-boat={boat} data-rig={standard ? "standard" : "custom"}>
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex size-6 items-center justify-center rounded bg-text text-xs font-semibold text-bg">{boat}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{name || `Boat ${boat}`}</span>
        {!standard ? (
          <span className="rounded-sm border border-border px-1 text-[10px] font-medium uppercase tracking-wide text-text-2" title="Rigging differs from standard">
            Rig
          </span>
        ) : null}
        {canEdit && onRig ? (
          <AnchoredMenu
            items={[
              { key: "flip", label: "Flip all oars", icon: <ArrowLeftRight className="size-3.5" />, onSelect: flipAll },
              { key: "standard", label: "Standard rig", icon: <RotateCcw className="size-3.5" />, disabled: standard, onSelect: () => onRig(null) },
            ]}
            trigger={(props) => (
              <button
                type="button"
                {...props}
                className="flex size-7 items-center justify-center rounded-md text-text-3 hover:bg-surface-2 hover:text-text"
                aria-label={`Rigging, boat ${boat}`}
                title="Rigging"
              >
                <Wrench className="size-3.5" />
              </button>
            )}
          />
        ) : null}
        {headerExtra}
      </header>
      <HullHeader />
      <ul className="pb-1">
        {BOW_TO_STERN.map((seat) => {
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
              onRig={canEdit && onRig && seat !== "cox" ? (side) => rigSeat(seat, side) : undefined}
              onRowerSide={canEdit && onRowerSide ? onRowerSide : undefined}
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

function firstName(name: string) {
  return name.split(" ")[0] || name;
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
  onRig,
  onRowerSide,
}: {
  boat: BoatNumber;
  seat: Seat;
  expected: RigSide | null;
  occupant: Rower | undefined;
  flags: Flag[];
  canEdit: boolean;
  selected: boolean;
  placing: boolean;
  onClick: () => void;
  onRig?: (side: RigSide) => void;
  onRowerSide?: (rower: Rower, side: Side) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `seat:${boat}:${seat}`, data: { boat, seat }, disabled: !canEdit });
  const mismatch = flags.some((f) => f.kind === "side_mismatch");
  const doubled = flags.some((f) => f.kind === "double_booked");
  const unavailable = flags.some((f) => f.kind === "unavailable");
  const label = seatLabel(seat);

  const oarFor = (side: RigSide) => {
    if (!expected) return null;
    if (expected === side) {
      return (
        <Oar
          side={side}
          mismatch={mismatch}
          onClick={onRig ? () => onRig(otherSide(side)) : undefined}
          label={onRig ? `${label}: move oar to ${otherSide(side)}` : `${label} rigged ${side}`}
        />
      );
    }
    return <OarSlot onClick={onRig ? () => onRig(side) : undefined} label={`${label}: rig ${side}`} />;
  };

  const mismatchMenu =
    mismatch && occupant && expected && (onRig || onRowerSide) ? (
      <AnchoredMenu
        items={[
          ...(onRig
            ? [{ key: "rig", label: `Rig ${label} ${otherSide(expected)}`, icon: <ArrowLeftRight className="size-3.5" />, onSelect: () => onRig(otherSide(expected)) }]
            : []),
          ...(onRowerSide
            ? [
                {
                  key: "switch",
                  label: `${firstName(occupant.name)} rows ${expected}`,
                  icon: <UserRound className="size-3.5" />,
                  group: !!onRig,
                  onSelect: () => onRowerSide(occupant, expected),
                },
                { key: "both", label: `${firstName(occupant.name)} rows both`, icon: <UserRound className="size-3.5" />, onSelect: () => onRowerSide(occupant, "both") },
              ]
            : []),
        ]}
        trigger={(props) => (
          <button
            type="button"
            {...props}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex size-5 items-center justify-center rounded text-text hover:bg-surface-2"
            aria-label="Side mismatch, fix"
            title="Side mismatch"
            data-flag="side_mismatch"
          >
            <TriangleAlert className="size-3.5" />
          </button>
        )}
      />
    ) : mismatch ? (
      <TriangleAlert className="size-3.5" aria-label="Side mismatch" data-flag="side_mismatch" />
    ) : null;

  return (
    <HullRow
      ref={setNodeRef}
      seat={seat}
      port={oarFor("port")}
      starboard={oarFor("starboard")}
      className={cn(placing && canEdit && "cursor-pointer")}
      cellClassName={cn(isOver && "bg-surface")}
      data-seat={`${boat}:${seat}`}
    >
      <span className={cn("w-4 shrink-0 text-center text-xs font-semibold tabular", seat === "cox" ? "text-text-3" : "text-text-2")}>
        {seat === "cox" ? "C" : label}
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
              {mismatchMenu}
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
    </HullRow>
  );
}
