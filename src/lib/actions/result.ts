export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = undefined>(error: unknown): ActionResult<T> {
  if (typeof error === "string") return { ok: false, error };
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return { ok: false, error: friendly(error.message) };
  }
  return { ok: false, error: "Something went wrong" };
}

function friendly(message: string): string {
  if (message.includes("row-level security")) return "You do not have permission to do that";
  if (message.includes("sessions_session_date_slot_key")) return "A session already exists for that date and slot";
  if (message.includes("lineups_one_primary_idx")) return "Only one lineup can be primary";
  return message;
}
