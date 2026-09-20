import { cache } from "react";

import type { Coach } from "@/domain/types";
import { createClient } from "@/lib/supabase/server";

export interface Viewer {
  userId: string | null;
  email: string | null;
  coach: Coach | null;
}

export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { userId: null, email: null, coach: null };
  const { data: coach } = await supabase.from("coaches").select("id, name").eq("id", user.id).maybeSingle();
  return { userId: user.id, email: user.email ?? null, coach: coach ?? null };
});
