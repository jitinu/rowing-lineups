export const SIDES = ["port", "starboard", "both"] as const;
export type Side = (typeof SIDES)[number];

export const SLOTS = ["AM", "PM"] as const;
export type Slot = (typeof SLOTS)[number];

export const SEATS = ["bow", "2", "3", "4", "5", "6", "7", "stroke", "cox"] as const;
export type Seat = (typeof SEATS)[number];

export const ROWING_SEATS = SEATS.filter((s) => s !== "cox") as Exclude<Seat, "cox">[];
export type RowingSeat = Exclude<Seat, "cox">;

export const BOAT_NUMBERS = [1, 2, 3, 4] as const;
export type BoatNumber = (typeof BOAT_NUMBERS)[number];

export const AVAILABILITY_STATUSES = ["out", "limited"] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export type RiggingSide = Exclude<Side, "both">;
export type Rigging = Record<RowingSeat, RiggingSide>;

export const STANDARD_RIGGING: Rigging = {
  bow: "starboard",
  "2": "port",
  "3": "starboard",
  "4": "port",
  "5": "starboard",
  "6": "port",
  "7": "starboard",
  stroke: "port",
};

export interface Rower {
  id: string;
  name: string;
  side: Side;
  weight_kg: number | null;
  class_year: number | null;
  is_coxswain: boolean;
  active: boolean;
  squad: string | null;
  can_steer: boolean;
}

export interface Coach {
  id: string;
  name: string;
}

export interface Session {
  id: string;
  session_date: string;
  slot: Slot;
  title: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Lineup {
  id: string;
  session_id: string;
  name: string;
  position: number;
  is_primary: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SeatAssignment {
  id: string;
  lineup_id: string;
  boat_number: BoatNumber;
  seat: Seat;
  rower_id: string;
}

export interface BoatConfig {
  id: string;
  lineup_id: string;
  boat_number: BoatNumber;
  name: string | null;
  rigging: Partial<Rigging> | null;
  workout_notes: string | null;
}

export interface SessionNote {
  id: string;
  session_id: string;
  coach_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface Availability {
  id: string;
  rower_id: string;
  session_id: string;
  status: AvailabilityStatus;
  reason: string | null;
}

/** Minimal shape needed by the pure engines (validation, balance, diff). */
export interface SeatRef {
  boat_number: BoatNumber;
  seat: Seat;
  rower_id: string;
}

export function isBoatNumber(n: number): n is BoatNumber {
  return (BOAT_NUMBERS as readonly number[]).includes(n);
}

export function isSeat(s: string): s is Seat {
  return (SEATS as readonly string[]).includes(s);
}

export function seatLabel(seat: Seat): string {
  if (seat === "bow") return "B";
  if (seat === "stroke") return "S";
  if (seat === "cox") return "C";
  return seat;
}

export function seatKey(boat: BoatNumber, seat: Seat): string {
  return `${boat}:${seat}`;
}
