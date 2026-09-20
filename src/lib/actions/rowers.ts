"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { type Side, SIDES } from "@/domain/types";
import { createClient } from "@/lib/supabase/server";

import { type ActionResult, fail, ok } from "./result";

const rowerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  side: z.enum(SIDES),
  weight_kg: z.coerce.number().positive().max(200).nullable(),
  class_year: z.coerce.number().int().min(2000).max(2100).nullable(),
  is_coxswain: z.boolean(),
  can_steer: z.boolean(),
});

export type RowerInput = z.infer<typeof rowerSchema>;

function parse(formData: FormData) {
  const isCox = formData.get("is_coxswain") === "on";
  return rowerSchema.safeParse({
    name: formData.get("name"),
    side: isCox ? "both" : formData.get("side"),
    weight_kg: formData.get("weight_kg") || null,
    class_year: formData.get("class_year") || null,
    is_coxswain: isCox,
    can_steer: formData.get("can_steer") === "on" || isCox,
  });
}

export async function createRower(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = parse(formData);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid rower");
  const supabase = await createClient();
  const { error } = await supabase.from("rowers").insert(parsed.data);
  if (error) return fail(error);
  revalidatePath("/roster");
  return ok(undefined);
}

export async function updateRower(id: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = parse(formData);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid rower");
  const supabase = await createClient();
  const { error } = await supabase.from("rowers").update(parsed.data).eq("id", id);
  if (error) return fail(error);
  revalidatePath("/roster");
  return ok(undefined);
}

export async function setRowerSide(id: string, side: Side): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("rowers").update({ side }).eq("id", id);
  if (error) return fail(error);
  revalidatePath("/roster");
  revalidatePath("/sessions", "layout");
  return ok(undefined);
}

export async function setRowerActive(id: string, active: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("rowers").update({ active }).eq("id", id);
  if (error) return fail(error);
  revalidatePath("/roster");
  return ok(undefined);
}
