import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/database.types";

import { env } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component; middleware refreshes the session instead.
        }
      },
    },
  });
}
