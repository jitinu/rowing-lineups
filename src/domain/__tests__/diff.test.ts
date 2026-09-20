import { describe, expect, it } from "vitest";

import { boatBalance } from "../balance";
import { diffLineups, type SwapChange } from "../diff";
import { type Rower, type SeatRef, ROWING_SEATS, BOAT_NUMBERS, STANDARD_RIGGING } from "../types";

type R = Pick<Rower, "id" | "name" | "side" | "weight_kg" | "is_coxswain">;

function baseLineup() {
  const rowers: R[] = [];
  const assignments: SeatRef[] = [];
  for (const boat of BOAT_NUMBERS) {
    for (const seat of ROWING_SEATS) {
      const id = `b${boat}-${seat}`;
      rowers.push({ id, name: id, side: STANDARD_RIGGING[seat], weight_kg: 80, is_coxswain: false });
      assignments.push({ boat_number: boat, seat, rower_id: id });
    }
    const cox = `b${boat}-cox`;
    rowers.push({ id: cox, name: cox, side: "both", weight_kg: 55, is_coxswain: true });
    assignments.push({ boat_number: boat, seat: "cox", rower_id: cox });
  }
  return { rowers, assignments };
}

function clone(a: SeatRef[]): SeatRef[] {
  return a.map((x) => ({ ...x }));
}

function seatOf(a: SeatRef[], boat: number, seat: string) {
  return a.find((x) => x.boat_number === boat && x.seat === seat)!;
}

describe("diffLineups", () => {
  it("reports identical lineups as no changes", () => {
    const { rowers, assignments } = baseLineup();
    const d = diffLineups({ before: assignments, after: clone(assignments), rowers });
    expect(d.identical).toBe(true);
    expect(d.changes).toEqual([]);
    expect(d.boats.every((b) => b.delta.total_kg === 0 && b.delta.split_kg === 0)).toBe(true);
  });

  it("collapses a clean two-rower same-boat trade into a single swap", () => {
    const { rowers, assignments } = baseLineup();
    const after = clone(assignments);
    const five = seatOf(after, 1, "5");
    const six = seatOf(after, 1, "6");
    [five.rower_id, six.rower_id] = [six.rower_id, five.rower_id];

    const d = diffLineups({ before: assignments, after, rowers });
    expect(d.counts).toEqual({ swaps: 1, moves: 0, adds: 0, drops: 0 });
    const swap = d.changes[0] as SwapChange;
    expect(swap.kind).toBe("swap");
    expect(swap.boat_number).toBe(1);
    // `a` is the rower now sitting in the seat nearer the stern (6 before 5).
    expect(swap.a).toEqual({ rower_id: "b1-5", from: "5", to: "6" });
    expect(swap.b).toEqual({ rower_id: "b1-6", from: "6", to: "5" });
    expect(d.boats[0].changes).toHaveLength(1);
    expect(d.boats.slice(1).every((b) => b.changes.length === 0)).toBe(true);
  });

  it("does not label a three-way rotation as a swap", () => {
    const { rowers, assignments } = baseLineup();
    const after = clone(assignments);
    const s2 = seatOf(after, 2, "2");
    const s3 = seatOf(after, 2, "3");
    const s4 = seatOf(after, 2, "4");
    const [r2, r3, r4] = [s2.rower_id, s3.rower_id, s4.rower_id];
    s2.rower_id = r4;
    s3.rower_id = r2;
    s4.rower_id = r3;

    const d = diffLineups({ before: assignments, after, rowers });
    expect(d.counts).toEqual({ swaps: 0, moves: 3, adds: 0, drops: 0 });
    expect(d.changes.every((c) => c.kind === "move" && !c.cross_boat)).toBe(true);
  });

  it("keeps a cross-boat trade as two individual moves", () => {
    const { rowers, assignments } = baseLineup();
    const after = clone(assignments);
    const a = seatOf(after, 1, "stroke");
    const b = seatOf(after, 2, "stroke");
    [a.rower_id, b.rower_id] = [b.rower_id, a.rower_id];

    const d = diffLineups({ before: assignments, after, rowers });
    expect(d.counts).toEqual({ swaps: 0, moves: 2, adds: 0, drops: 0 });
    expect(d.changes.every((c) => c.kind === "move" && c.cross_boat)).toBe(true);
    // A cross-boat move appears under both boats it touches.
    expect(d.boats[0].changes).toHaveLength(2);
    expect(d.boats[1].changes).toHaveLength(2);
    expect(d.boats[2].changes).toHaveLength(0);
  });

  it("reports adds and drops individually", () => {
    const { rowers, assignments } = baseLineup();
    rowers.push({ id: "sub", name: "sub", side: "port", weight_kg: 90, is_coxswain: false });
    const after = clone(assignments).filter((x) => !(x.boat_number === 3 && x.seat === "bow"));
    seatOf(after, 3, "2").rower_id = "sub";

    const d = diffLineups({ before: assignments, after, rowers });
    expect(d.counts).toEqual({ swaps: 0, moves: 0, adds: 1, drops: 2 });
    expect(d.changes).toEqual(
      expect.arrayContaining([
        { kind: "add", rower_id: "sub", to: { boat_number: 3, seat: "2" } },
        { kind: "drop", rower_id: "b3-bow", from: { boat_number: 3, seat: "bow" } },
        { kind: "drop", rower_id: "b3-2", from: { boat_number: 3, seat: "2" } },
      ]),
    );
  });

  it("computes weight and balance deltas per boat", () => {
    const { rowers, assignments } = baseLineup();
    rowers.find((r) => r.id === "b1-5")!.weight_kg = 70; // starboard seat
    rowers.find((r) => r.id === "b1-6")!.weight_kg = 90; // port seat
    const after = clone(assignments);
    const five = seatOf(after, 1, "5");
    const six = seatOf(after, 1, "6");
    [five.rower_id, six.rower_id] = [six.rower_id, five.rower_id];

    const d = diffLineups({ before: assignments, after, rowers });
    const b1 = d.boats[0].delta;
    expect(b1.before.split_kg).toBe(20);
    expect(b1.after.split_kg).toBe(-20);
    expect(b1.total_kg).toBe(0);
    expect(b1.split_kg).toBe(-40);
    expect(b1.side_mismatches_before).toBe(0);
    expect(b1.side_mismatches_after).toBe(2);

    rowers.push({ id: "heavy", name: "heavy", side: "port", weight_kg: 100, is_coxswain: false });
    const after2 = clone(assignments);
    seatOf(after2, 2, "2").rower_id = "heavy";
    const d2 = diffLineups({ before: assignments, after: after2, rowers });
    expect(d2.boats[1].delta.total_kg).toBe(20);
    expect(d2.boats[1].delta.split_kg).toBe(20);
  });
});

describe("boatBalance", () => {
  it("sums weights by rigged side and excludes the cox", () => {
    const { rowers, assignments } = baseLineup();
    const b = boatBalance(1, assignments, rowers);
    expect(b).toEqual({
      boat_number: 1,
      total_kg: 640,
      port_kg: 320,
      starboard_kg: 320,
      split_kg: 0,
      unknown: 0,
      rowers: 8,
    });
  });

  it("counts rowers with unknown weight separately", () => {
    const { rowers, assignments } = baseLineup();
    rowers.find((r) => r.id === "b1-bow")!.weight_kg = null;
    const b = boatBalance(1, assignments, rowers);
    expect(b.unknown).toBe(1);
    expect(b.total_kg).toBe(560);
    expect(b.starboard_kg).toBe(240);
  });

  it("honors rigging overrides", () => {
    const { rowers, assignments } = baseLineup();
    const b = boatBalance(1, assignments, rowers, [{ boat_number: 1, rigging: { bow: "port" } }]);
    expect(b.port_kg).toBe(400);
    expect(b.starboard_kg).toBe(240);
  });
});
