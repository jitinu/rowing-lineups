import type {
  Availability,
  BoatConfig,
  BoatNumber,
  Coach,
  Lineup,
  Rower,
  Seat,
  SeatAssignment,
  Session,
  SessionNote,
} from "@/domain/types";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

export function toRower(r: Row<"rowers">): Rower {
  return {
    id: r.id,
    name: r.name,
    side: r.side,
    weight_kg: r.weight_kg,
    class_year: r.class_year,
    is_coxswain: r.is_coxswain,
    active: r.active,
    squad: r.squad,
    can_steer: r.can_steer,
  };
}

export function toAssignment(a: Row<"seat_assignments">): SeatAssignment {
  return {
    id: a.id,
    lineup_id: a.lineup_id,
    boat_number: a.boat_number as BoatNumber,
    seat: a.seat as Seat,
    rower_id: a.rower_id,
  };
}

export function toBoatConfig(c: Row<"boat_config">): BoatConfig {
  return {
    id: c.id,
    lineup_id: c.lineup_id,
    boat_number: c.boat_number as BoatNumber,
    name: c.name,
    rigging: (c.rigging as BoatConfig["rigging"]) ?? null,
    workout_notes: c.workout_notes,
  };
}

export async function listRowers(opts: { includeInactive?: boolean } = {}): Promise<Rower[]> {
  const supabase = await createClient();
  let q = supabase.from("rowers").select("*").order("is_coxswain").order("name");
  if (!opts.includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data.map(toRower);
}

export async function listSessions(): Promise<Session[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("session_date", { ascending: false })
    .order("slot");
  if (error) throw error;
  return data;
}

export interface SessionBundle {
  session: Session;
  lineups: Lineup[];
  assignments: SeatAssignment[];
  boatConfigs: BoatConfig[];
  notes: SessionNote[];
  availability: Availability[];
  coaches: Coach[];
  rowers: Rower[];
}

export async function getSessionBundle(sessionId: string): Promise<SessionBundle | null> {
  const supabase = await createClient();
  const { data: session, error } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
  if (error) throw error;
  if (!session) return null;

  const [lineupsRes, notesRes, availRes, coachesRes, rowersRes] = await Promise.all([
    supabase.from("lineups").select("*").eq("session_id", sessionId).order("position").order("created_at"),
    supabase.from("session_notes").select("*").eq("session_id", sessionId).order("created_at"),
    supabase.from("availability").select("*").eq("session_id", sessionId),
    supabase.from("coaches").select("id, name").order("name"),
    supabase.from("rowers").select("*").order("is_coxswain").order("name"),
  ]);
  for (const r of [lineupsRes, notesRes, availRes, coachesRes, rowersRes]) if (r.error) throw r.error;

  const lineupIds = (lineupsRes.data ?? []).map((l) => l.id);
  const [assignRes, configRes] = lineupIds.length
    ? await Promise.all([
        supabase.from("seat_assignments").select("*").in("lineup_id", lineupIds),
        supabase.from("boat_config").select("*").in("lineup_id", lineupIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (assignRes.error) throw assignRes.error;
  if (configRes.error) throw configRes.error;

  return {
    session,
    lineups: lineupsRes.data ?? [],
    assignments: (assignRes.data ?? []).map(toAssignment),
    boatConfigs: (configRes.data ?? []).map(toBoatConfig),
    notes: notesRes.data ?? [],
    availability: availRes.data ?? [],
    coaches: coachesRes.data ?? [],
    rowers: (rowersRes.data ?? []).map(toRower),
  };
}

export interface LineupSnapshot {
  lineup: Lineup;
  session: Session;
  assignments: SeatAssignment[];
  boatConfigs: BoatConfig[];
}

export async function getLineupSnapshot(lineupId: string): Promise<LineupSnapshot | null> {
  const supabase = await createClient();
  const { data: lineup, error } = await supabase.from("lineups").select("*").eq("id", lineupId).maybeSingle();
  if (error) throw error;
  if (!lineup) return null;
  const [sessionRes, assignRes, configRes] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", lineup.session_id).single(),
    supabase.from("seat_assignments").select("*").eq("lineup_id", lineupId),
    supabase.from("boat_config").select("*").eq("lineup_id", lineupId),
  ]);
  if (sessionRes.error) throw sessionRes.error;
  if (assignRes.error) throw assignRes.error;
  if (configRes.error) throw configRes.error;
  return {
    lineup,
    session: sessionRes.data,
    assignments: assignRes.data.map(toAssignment),
    boatConfigs: configRes.data.map(toBoatConfig),
  };
}

export interface SessionWithLineups extends Session {
  lineups: Pick<Lineup, "id" | "name" | "position" | "is_primary">[];
}

export async function listSessionsWithLineups(): Promise<SessionWithLineups[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*, lineups(id, name, position, is_primary)")
    .order("session_date", { ascending: false })
    .order("slot");
  if (error) throw error;
  return data.map((s) => ({
    ...s,
    lineups: [...s.lineups].sort((a, b) => a.position - b.position),
  }));
}
