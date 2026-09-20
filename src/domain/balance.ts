import { riggingForBoat } from "./rigging";
import { type BoatConfig, type BoatNumber, BOAT_NUMBERS, type Rower, type SeatRef } from "./types";

export interface BoatBalance {
  boat_number: BoatNumber;
  /** Total crew weight in kg, excluding cox. Rowers without a weight are counted in `unknown`. */
  total_kg: number;
  port_kg: number;
  starboard_kg: number;
  /** port minus starboard */
  split_kg: number;
  unknown: number;
  rowers: number;
}

export function boatBalance(
  boat: BoatNumber,
  assignments: SeatRef[],
  rowers: Pick<Rower, "id" | "weight_kg">[],
  boatConfigs: Pick<BoatConfig, "boat_number" | "rigging">[] = [],
): BoatBalance {
  const rigging = riggingForBoat(boat, boatConfigs);
  const weights = new Map(rowers.map((r) => [r.id, r.weight_kg]));
  let port = 0;
  let starboard = 0;
  let unknown = 0;
  let count = 0;
  for (const a of assignments) {
    if (a.boat_number !== boat || a.seat === "cox") continue;
    count += 1;
    const w = weights.get(a.rower_id);
    if (w == null) {
      unknown += 1;
      continue;
    }
    if (rigging[a.seat] === "port") port += w;
    else starboard += w;
  }
  return {
    boat_number: boat,
    total_kg: round1(port + starboard),
    port_kg: round1(port),
    starboard_kg: round1(starboard),
    split_kg: round1(port - starboard),
    unknown,
    rowers: count,
  };
}

export function allBoatBalances(
  assignments: SeatRef[],
  rowers: Pick<Rower, "id" | "weight_kg">[],
  boatConfigs: Pick<BoatConfig, "boat_number" | "rigging">[] = [],
): BoatBalance[] {
  return BOAT_NUMBERS.map((b) => boatBalance(b, assignments, rowers, boatConfigs));
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
