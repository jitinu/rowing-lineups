"use server";

import { revalidatePath } from "next/cache";

import { type BoatNumber, type Seat } from "@/domain/types";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { type ActionResult, fail, ok } from "./result";

async function sessionPath(lineupId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("lineups").select("session_id").eq("id", lineupId).maybeSingle();
  return data ? `/sessions/${data.session_id}` : null;
}

export async function createLineup(sessionId: string, name: string): Promise<ActionResult<{ id: string }>> {
  const viewer = await getViewer();
  if (!viewer.coach) return fail("Sign in as a coach");
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("lineups")
    .select("position")
    .eq("session_id", sessionId)
    .order("position", { ascending: false })
    .limit(1);
  const position = (existing?.[0]?.position ?? -1) + 1;
  const { data, error } = await supabase
    .from("lineups")
    .insert({
      session_id: sessionId,
      name: name.trim() || `Piece ${position + 1}`,
      position,
      is_primary: position === 0,
      created_by: viewer.coach.id,
    })
    .select("id")
    .single();
  if (error) return fail(error);
  revalidatePath(`/sessions/${sessionId}`);
  return ok({ id: data.id });
}

export async function cloneLineup(sourceLineupId: string, name: string): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("clone_lineup", {
    source_lineup_id: sourceLineupId,
    new_name: name.trim() || "Copy",
  });
  if (error) return fail(error);
  const path = await sessionPath(data);
  if (path) revalidatePath(path);
  return ok({ id: data });
}

export async function renameLineup(lineupId: string, name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return fail("Name cannot be empty");
  const supabase = await createClient();
  const { error } = await supabase.from("lineups").update({ name: trimmed }).eq("id", lineupId);
  if (error) return fail(error);
  const path = await sessionPath(lineupId);
  if (path) revalidatePath(path);
  return ok(undefined);
}

export async function deleteLineup(lineupId: string): Promise<ActionResult> {
  const path = await sessionPath(lineupId);
  const supabase = await createClient();
  const { error } = await supabase.from("lineups").delete().eq("id", lineupId);
  if (error) return fail(error);
  if (path) revalidatePath(path);
  return ok(undefined);
}

export async function setPrimaryLineup(lineupId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_primary_lineup", { target_lineup_id: lineupId });
  if (error) return fail(error);
  const path = await sessionPath(lineupId);
  if (path) revalidatePath(path);
  return ok(undefined);
}

/** Persist a new ordering: `orderedIds` lists every lineup id in the session in display order. */
export async function reorderLineups(sessionId: string, orderedIds: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const results = await Promise.all(
    orderedIds.map((id, position) =>
      supabase.from("lineups").update({ position }).eq("id", id).eq("session_id", sessionId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return fail(failed.error);
  revalidatePath(`/sessions/${sessionId}`);
  return ok(undefined);
}

export async function assignSeat(input: {
  lineupId: string;
  rowerId: string;
  boat: BoatNumber;
  seat: Seat;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_seat", {
    p_lineup_id: input.lineupId,
    p_rower_id: input.rowerId,
    p_boat: input.boat,
    p_seat: input.seat,
  });
  if (error) return fail(error);
  const path = await sessionPath(input.lineupId);
  if (path) revalidatePath(path);
  return ok(undefined);
}

export async function unassignSeat(input: { lineupId: string; rowerId: string }): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("unassign_seat", { p_lineup_id: input.lineupId, p_rower_id: input.rowerId });
  if (error) return fail(error);
  const path = await sessionPath(input.lineupId);
  if (path) revalidatePath(path);
  return ok(undefined);
}

export async function clearBoat(lineupId: string, boat: BoatNumber): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("seat_assignments")
    .delete()
    .eq("lineup_id", lineupId)
    .eq("boat_number", boat);
  if (error) return fail(error);
  const path = await sessionPath(lineupId);
  if (path) revalidatePath(path);
  return ok(undefined);
}

export async function updateBoatConfig(input: {
  lineupId: string;
  boat: BoatNumber;
  name?: string | null;
  rigging?: Record<string, "port" | "starboard"> | null;
  workout_notes?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("boat_config").upsert(
    {
      lineup_id: input.lineupId,
      boat_number: input.boat,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.rigging !== undefined ? { rigging: input.rigging } : {}),
      ...(input.workout_notes !== undefined ? { workout_notes: input.workout_notes } : {}),
    },
    { onConflict: "lineup_id,boat_number" },
  );
  if (error) return fail(error);
  const path = await sessionPath(input.lineupId);
  if (path) revalidatePath(path);
  return ok(undefined);
}
