import { type BoatConfig, type BoatNumber, type Rigging, type RowingSeat, STANDARD_RIGGING } from "./types";

export function riggingForBoat(
  boat: BoatNumber,
  configs: Pick<BoatConfig, "boat_number" | "rigging">[] = [],
): Rigging {
  const override = configs.find((c) => c.boat_number === boat)?.rigging;
  return { ...STANDARD_RIGGING, ...(override ?? {}) };
}

export function expectedSide(seat: RowingSeat, rigging: Rigging = STANDARD_RIGGING) {
  return rigging[seat];
}
