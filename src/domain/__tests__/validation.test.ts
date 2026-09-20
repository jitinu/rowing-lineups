import { describe, expect, it } from "vitest";

import { type Rower, type SeatRef, ROWING_SEATS, BOAT_NUMBERS, STANDARD_RIGGING } from "../types";
import { validateLineup } from "../validation";

function rower(id: string, side: Rower["side"], extra: Partial<Rower> = {}): Rower {
  return {
    id,
    name: id,
    side,
    weight_kg: 80,
    class_year: null,
    is_coxswain: false,
    active: true,
    squad: null,
    can_steer: false,
    ...extra,
  };
}

/** Builds a full, rigging-correct set of four boats. Rower ids look like `b1-bow`, `b2-cox`. */
function fullLineup() {
  const rowers: Rower[] = [];
  const assignments: SeatRef[] = [];
  for (const boat of BOAT_NUMBERS) {
    for (const seat of ROWING_SEATS) {
      const id = `b${boat}-${seat}`;
      rowers.push(rower(id, STANDARD_RIGGING[seat]));
      assignments.push({ boat_number: boat, seat, rower_id: id });
    }
    const cox = `b${boat}-cox`;
    rowers.push(rower(cox, "both", { is_coxswain: true, weight_kg: 55 }));
    assignments.push({ boat_number: boat, seat: "cox", rower_id: cox });
  }
  return { rowers, assignments };
}

describe("validateLineup", () => {
  it("returns no flags for a full, correctly rigged lineup", () => {
    const { rowers, assignments } = fullLineup();
    expect(validateLineup({ assignments, rowers })).toEqual([]);
  });

  it("flags a side mismatch when a port rower sits in a starboard seat", () => {
    const { rowers, assignments } = fullLineup();
    const target = rowers.find((r) => r.id === "b1-bow")!;
    target.side = "port";
    const flags = validateLineup({ assignments, rowers });
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ kind: "side_mismatch", boat_number: 1, seat: "bow", rower_id: "b1-bow" });
  });

  it("does not flag rowers who can row both sides", () => {
    const { rowers, assignments } = fullLineup();
    rowers.find((r) => r.id === "b1-bow")!.side = "both";
    expect(validateLineup({ assignments, rowers })).toEqual([]);
  });

  it("respects a per-boat rigging override", () => {
    const { rowers, assignments } = fullLineup();
    const flags = validateLineup({
      assignments,
      rowers,
      boatConfigs: [{ boat_number: 2, rigging: { bow: "port" } }],
    });
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ kind: "side_mismatch", boat_number: 2, seat: "bow" });
  });

  it("flags every seat a double-booked rower occupies", () => {
    const { rowers, assignments } = fullLineup();
    const dup = assignments.find((a) => a.boat_number === 2 && a.seat === "3")!;
    dup.rower_id = "b1-3";
    const flags = validateLineup({ assignments, rowers }).filter((f) => f.kind === "double_booked");
    expect(flags).toHaveLength(2);
    expect(flags.map((f) => `${f.boat_number}:${f.seat}`).sort()).toEqual(["1:3", "2:3"]);
  });

  it("flags empty seats and a missing cox separately", () => {
    const { rowers, assignments } = fullLineup();
    const trimmed = assignments.filter((a) => !(a.boat_number === 3 && (a.seat === "cox" || a.seat === "5")));
    const flags = validateLineup({ assignments: trimmed, rowers });
    expect(flags).toHaveLength(2);
    expect(flags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "missing_cox", boat_number: 3, seat: "cox" }),
        expect.objectContaining({ kind: "empty_seat", boat_number: 3, seat: "5" }),
      ]),
    );
  });

  it("flags rowers assigned while marked out or limited", () => {
    const { rowers, assignments } = fullLineup();
    const flags = validateLineup({
      assignments,
      rowers,
      availability: [
        { rower_id: "b4-stroke", status: "out" },
        { rower_id: "b4-cox", status: "limited" },
        { rower_id: "not-assigned", status: "out" },
      ],
    });
    expect(flags).toHaveLength(2);
    expect(flags.map((f) => f.rower_id).sort()).toEqual(["b4-cox", "b4-stroke"]);
    expect(flags.every((f) => f.kind === "unavailable")).toBe(true);
  });

  it("reports empty seats for an entirely empty lineup", () => {
    const flags = validateLineup({ assignments: [], rowers: [] });
    expect(flags).toHaveLength(36);
    expect(flags.filter((f) => f.kind === "missing_cox")).toHaveLength(4);
    expect(flags.filter((f) => f.kind === "empty_seat")).toHaveLength(32);
  });
});
