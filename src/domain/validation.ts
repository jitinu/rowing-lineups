import { riggingForBoat } from "./rigging";
import {
  type Availability,
  type BoatConfig,
  type BoatNumber,
  BOAT_NUMBERS,
  type Rower,
  type Seat,
  SEATS,
  type SeatRef,
  seatKey,
} from "./types";

export type FlagKind = "side_mismatch" | "double_booked" | "empty_seat" | "missing_cox" | "unavailable";

export interface Flag {
  kind: FlagKind;
  boat_number: BoatNumber;
  seat: Seat | null;
  rower_id: string | null;
  message: string;
}

export interface ValidationInput {
  assignments: SeatRef[];
  rowers: Pick<Rower, "id" | "name" | "side" | "is_coxswain">[];
  availability?: Pick<Availability, "rower_id" | "status">[];
  boatConfigs?: Pick<BoatConfig, "boat_number" | "rigging">[];
}

export function validateLineup(input: ValidationInput): Flag[] {
  const { assignments, rowers, availability = [], boatConfigs = [] } = input;
  const flags: Flag[] = [];
  const rowerById = new Map(rowers.map((r) => [r.id, r]));
  const unavailable = new Map(availability.map((a) => [a.rower_id, a.status]));
  const byKey = new Map(assignments.map((a) => [seatKey(a.boat_number, a.seat), a]));

  const seatsByRower = new Map<string, SeatRef[]>();
  for (const a of assignments) {
    const list = seatsByRower.get(a.rower_id) ?? [];
    list.push(a);
    seatsByRower.set(a.rower_id, list);
  }
  for (const [rowerId, seats] of seatsByRower) {
    if (seats.length < 2) continue;
    const name = rowerById.get(rowerId)?.name ?? "Rower";
    for (const s of seats) {
      flags.push({
        kind: "double_booked",
        boat_number: s.boat_number,
        seat: s.seat,
        rower_id: rowerId,
        message: `${name} is in ${seats.length} seats`,
      });
    }
  }

  for (const boat of BOAT_NUMBERS) {
    const rigging = riggingForBoat(boat, boatConfigs);
    for (const seat of SEATS) {
      const a = byKey.get(seatKey(boat, seat));
      if (!a) {
        flags.push({
          kind: seat === "cox" ? "missing_cox" : "empty_seat",
          boat_number: boat,
          seat,
          rower_id: null,
          message: seat === "cox" ? "No cox" : "Empty seat",
        });
        continue;
      }
      const rower = rowerById.get(a.rower_id);
      if (seat !== "cox" && rower && rower.side !== "both") {
        const expected = rigging[seat];
        if (rower.side !== expected) {
          flags.push({
            kind: "side_mismatch",
            boat_number: boat,
            seat,
            rower_id: a.rower_id,
            message: `${rower.name} rows ${rower.side}, seat is ${expected}`,
          });
        }
      }
      const status = unavailable.get(a.rower_id);
      if (status) {
        flags.push({
          kind: "unavailable",
          boat_number: boat,
          seat,
          rower_id: a.rower_id,
          message: `${rower?.name ?? "Rower"} is ${status}`,
        });
      }
    }
  }

  return flags;
}

export function flagsForSeat(flags: Flag[], boat: BoatNumber, seat: Seat): Flag[] {
  return flags.filter((f) => f.boat_number === boat && f.seat === seat);
}

export function flagsForBoat(flags: Flag[], boat: BoatNumber): Flag[] {
  return flags.filter((f) => f.boat_number === boat);
}
