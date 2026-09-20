import { boatBalance, type BoatBalance, round1 } from "./balance";
import { type BoatConfig, type BoatNumber, BOAT_NUMBERS, type Rower, type Seat, type SeatRef } from "./types";
import { validateLineup } from "./validation";

export interface SeatPos {
  boat_number: BoatNumber;
  seat: Seat;
}

export interface SwapChange {
  kind: "swap";
  boat_number: BoatNumber;
  /** Two rowers who traded seats within the same boat. `a` sits in the lower-index seat after the swap. */
  a: { rower_id: string; from: Seat; to: Seat };
  b: { rower_id: string; from: Seat; to: Seat };
}

export interface MoveChange {
  kind: "move";
  rower_id: string;
  from: SeatPos;
  to: SeatPos;
  cross_boat: boolean;
}

export interface AddChange {
  kind: "add";
  rower_id: string;
  to: SeatPos;
}

export interface DropChange {
  kind: "drop";
  rower_id: string;
  from: SeatPos;
}

export type Change = SwapChange | MoveChange | AddChange | DropChange;

export interface BoatDelta {
  boat_number: BoatNumber;
  before: BoatBalance;
  after: BoatBalance;
  total_kg: number;
  split_kg: number;
  side_mismatches_before: number;
  side_mismatches_after: number;
}

export interface BoatDiff {
  boat_number: BoatNumber;
  /** Changes that touch this boat. Cross-boat moves appear under both source and destination boats. */
  changes: Change[];
  delta: BoatDelta;
}

export interface LineupDiff {
  boats: BoatDiff[];
  changes: Change[];
  counts: { swaps: number; moves: number; adds: number; drops: number };
  identical: boolean;
}

export interface DiffInput {
  before: SeatRef[];
  after: SeatRef[];
  rowers: Pick<Rower, "id" | "name" | "side" | "weight_kg" | "is_coxswain">[];
  beforeConfigs?: Pick<BoatConfig, "boat_number" | "rigging">[];
  afterConfigs?: Pick<BoatConfig, "boat_number" | "rigging">[];
}

const SEAT_ORDER: Seat[] = ["cox", "stroke", "7", "6", "5", "4", "3", "2", "bow"];

function samePos(x: SeatPos, y: SeatPos) {
  return x.boat_number === y.boat_number && x.seat === y.seat;
}

function posKey(p: SeatPos) {
  return `${p.boat_number}:${p.seat}`;
}

export function diffLineups(input: DiffInput): LineupDiff {
  const { before, after, rowers, beforeConfigs = [], afterConfigs = [] } = input;
  const beforeByRower = new Map(before.map((a) => [a.rower_id, a]));
  const afterByRower = new Map(after.map((a) => [a.rower_id, a]));

  const moves: MoveChange[] = [];
  const adds: AddChange[] = [];
  const drops: DropChange[] = [];

  const rowerIds = new Set([...beforeByRower.keys(), ...afterByRower.keys()]);
  for (const id of rowerIds) {
    const b = beforeByRower.get(id);
    const a = afterByRower.get(id);
    if (b && a) {
      if (!samePos(b, a)) {
        moves.push({
          kind: "move",
          rower_id: id,
          from: { boat_number: b.boat_number, seat: b.seat },
          to: { boat_number: a.boat_number, seat: a.seat },
          cross_boat: b.boat_number !== a.boat_number,
        });
      }
    } else if (b) {
      drops.push({ kind: "drop", rower_id: id, from: { boat_number: b.boat_number, seat: b.seat } });
    } else if (a) {
      adds.push({ kind: "add", rower_id: id, to: { boat_number: a.boat_number, seat: a.seat } });
    }
  }

  // Pair clean same-boat trades: X from s1 to s2 and Y from s2 to s1.
  const swaps: SwapChange[] = [];
  const consumed = new Set<string>();
  const moveByFrom = new Map(moves.map((m) => [posKey(m.from), m]));
  for (const m of moves) {
    if (consumed.has(m.rower_id) || m.cross_boat) continue;
    const partner = moveByFrom.get(posKey(m.to));
    if (
      partner &&
      partner !== m &&
      !consumed.has(partner.rower_id) &&
      !partner.cross_boat &&
      samePos(partner.to, m.from)
    ) {
      consumed.add(m.rower_id);
      consumed.add(partner.rower_id);
      const [first, second] =
        SEAT_ORDER.indexOf(m.to.seat) <= SEAT_ORDER.indexOf(partner.to.seat) ? [m, partner] : [partner, m];
      swaps.push({
        kind: "swap",
        boat_number: m.from.boat_number,
        a: { rower_id: first.rower_id, from: first.from.seat, to: first.to.seat },
        b: { rower_id: second.rower_id, from: second.from.seat, to: second.to.seat },
      });
    }
  }
  const remainingMoves = moves.filter((m) => !consumed.has(m.rower_id));

  const changes: Change[] = [...swaps, ...remainingMoves, ...adds, ...drops];
  const boats: BoatDiff[] = BOAT_NUMBERS.map((boat) => ({
    boat_number: boat,
    changes: changes.filter((c) => touchesBoat(c, boat)).sort((x, y) => sortRank(x, boat) - sortRank(y, boat)),
    delta: boatDelta(boat, before, after, rowers, beforeConfigs, afterConfigs),
  }));

  return {
    boats,
    changes,
    counts: { swaps: swaps.length, moves: remainingMoves.length, adds: adds.length, drops: drops.length },
    identical: changes.length === 0,
  };
}

function touchesBoat(c: Change, boat: BoatNumber): boolean {
  switch (c.kind) {
    case "swap":
      return c.boat_number === boat;
    case "move":
      return c.from.boat_number === boat || c.to.boat_number === boat;
    case "add":
      return c.to.boat_number === boat;
    case "drop":
      return c.from.boat_number === boat;
  }
}

function sortRank(c: Change, boat: BoatNumber): number {
  const kindRank = { swap: 0, move: 1, add: 2, drop: 3 }[c.kind];
  const seat =
    c.kind === "swap"
      ? c.a.to
      : c.kind === "add"
        ? c.to.seat
        : c.kind === "drop"
          ? c.from.seat
          : c.to.boat_number === boat
            ? c.to.seat
            : c.from.seat;
  return kindRank * 100 + SEAT_ORDER.indexOf(seat);
}

function boatDelta(
  boat: BoatNumber,
  before: SeatRef[],
  after: SeatRef[],
  rowers: DiffInput["rowers"],
  beforeConfigs: Pick<BoatConfig, "boat_number" | "rigging">[],
  afterConfigs: Pick<BoatConfig, "boat_number" | "rigging">[],
): BoatDelta {
  const b = boatBalance(boat, before, rowers, beforeConfigs);
  const a = boatBalance(boat, after, rowers, afterConfigs);
  const mismatches = (assignments: SeatRef[], configs: Pick<BoatConfig, "boat_number" | "rigging">[]) =>
    validateLineup({ assignments, rowers, boatConfigs: configs }).filter(
      (f) => f.kind === "side_mismatch" && f.boat_number === boat,
    ).length;
  return {
    boat_number: boat,
    before: b,
    after: a,
    total_kg: round1(a.total_kg - b.total_kg),
    split_kg: round1(a.split_kg - b.split_kg),
    side_mismatches_before: mismatches(before, beforeConfigs),
    side_mismatches_after: mismatches(after, afterConfigs),
  };
}
