"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

import { type ActionResult, fail, ok } from "./result";

const credentials = z.object({ email: z.email(), password: z.string().min(1) });

export async function signIn(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return fail("Enter a valid email and password");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return fail(error.message);
  const next = formData.get("next");
  redirect(typeof next === "string" && next.startsWith("/") ? next : "/sessions");
  return ok(undefined);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sessions");
}
