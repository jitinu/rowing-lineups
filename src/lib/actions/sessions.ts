"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { SLOTS } from "@/domain/types";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { type ActionResult, fail, ok } from "./result";

const createSchema = z.object({
  session_date: z.iso.date(),
  slot: z.enum(SLOTS),
  title: z.string().trim().max(120).optional(),
});

export async function createSession(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = createSchema.safeParse({
    session_date: formData.get("session_date"),
    slot: formData.get("slot"),
    title: formData.get("title") || undefined,
  });
  if (!parsed.success) return fail("Pick a date and slot");
  const viewer = await getViewer();
  if (!viewer.coach) return fail("Sign in as a coach to create sessions");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({ ...parsed.data, title: parsed.data.title || null, created_by: viewer.coach.id })
    .select("id")
    .single();
  if (error) return fail(error);
  const { error: lineupErr } = await supabase
    .from("lineups")
    .insert({ session_id: data.id, name: "Piece 1", position: 0, is_primary: true, created_by: viewer.coach.id });
  if (lineupErr) return fail(lineupErr);
  revalidatePath("/sessions");
  redirect(`/sessions/${data.id}`);
  return ok(undefined);
}

export async function updateSessionTitle(sessionId: string, title: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ title: title.trim() || null })
    .eq("id", sessionId);
  if (error) return fail(error);
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/sessions");
  return ok(undefined);
}

export async function deleteSession(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) return fail(error);
  revalidatePath("/sessions");
  redirect("/sessions");
  return ok(undefined);
}

export async function setAvailability(input: {
  sessionId: string;
  rowerId: string;
  status: "out" | "limited" | null;
  reason?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  if (input.status === null) {
    const { error } = await supabase
      .from("availability")
      .delete()
      .eq("session_id", input.sessionId)
      .eq("rower_id", input.rowerId);
    if (error) return fail(error);
  } else {
    const { error } = await supabase
      .from("availability")
      .upsert(
        { session_id: input.sessionId, rower_id: input.rowerId, status: input.status, reason: input.reason ?? null },
        { onConflict: "rower_id,session_id" },
      );
    if (error) return fail(error);
  }
  revalidatePath(`/sessions/${input.sessionId}`);
  return ok(undefined);
}

export async function upsertMyNote(sessionId: string, body: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer.coach) return fail("Sign in as a coach to add notes");
  const supabase = await createClient();
  const trimmed = body.trim();
  if (!trimmed) {
    const { error } = await supabase
      .from("session_notes")
      .delete()
      .eq("session_id", sessionId)
      .eq("coach_id", viewer.coach.id);
    if (error) return fail(error);
  } else {
    const { error } = await supabase
      .from("session_notes")
      .upsert({ session_id: sessionId, coach_id: viewer.coach.id, body: trimmed }, { onConflict: "session_id,coach_id" });
    if (error) return fail(error);
  }
  revalidatePath(`/sessions/${sessionId}`);
  return ok(undefined);
}
