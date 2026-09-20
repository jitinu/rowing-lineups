/**
 * Row-level security tests. Run against a local Supabase stack:
 *   npm run db:start && npm run db:reset && npm run test:db
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

const suffix = Date.now().toString(36);
const users = {
  coachA: { email: `rls-coach-a-${suffix}@example.com`, password: "password123", id: "" },
  coachB: { email: `rls-coach-b-${suffix}@example.com`, password: "password123", id: "" },
  viewer: { email: `rls-viewer-${suffix}@example.com`, password: "password123", id: "" },
};

let coachA: SupabaseClient;
let coachB: SupabaseClient;
let viewer: SupabaseClient;
let sessionId = "";
let rowerId = "";

async function signedInClient(email: string, password: string) {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

beforeAll(async () => {
  for (const u of Object.values(users)) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (error) throw error;
    u.id = data.user.id;
  }
  const { error: coachErr } = await admin.from("coaches").insert([
    { id: users.coachA.id, name: "RLS Coach A" },
    { id: users.coachB.id, name: "RLS Coach B" },
  ]);
  if (coachErr) throw coachErr;

  coachA = await signedInClient(users.coachA.email, users.coachA.password);
  coachB = await signedInClient(users.coachB.email, users.coachB.password);
  viewer = await signedInClient(users.viewer.email, users.viewer.password);

  const { data: session, error: sessErr } = await admin
    .from("sessions")
    .insert({ session_date: "2099-01-01", slot: "PM", title: `rls-${suffix}`, created_by: users.coachA.id })
    .select("id")
    .single();
  if (sessErr) throw sessErr;
  sessionId = session.id;

  const { data: rower, error: rowerErr } = await admin
    .from("rowers")
    .insert({ name: `RLS Rower ${suffix}`, side: "port" })
    .select("id")
    .single();
  if (rowerErr) throw rowerErr;
  rowerId = rower.id;
});

afterAll(async () => {
  await admin.from("sessions").delete().eq("id", sessionId);
  await admin.from("rowers").delete().eq("id", rowerId);
  for (const u of Object.values(users)) {
    if (u.id) await admin.auth.admin.deleteUser(u.id);
  }
});

describe("read access", () => {
  it("anonymous visitors can read sessions, lineups and rowers", async () => {
    const { data, error } = await anon.from("sessions").select("id").eq("id", sessionId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    const { data: rowers } = await anon.from("rowers").select("id").eq("id", rowerId);
    expect(rowers).toHaveLength(1);
  });

  it("non-coach signed-in users can read", async () => {
    const { data, error } = await viewer.from("sessions").select("id").eq("id", sessionId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});

describe("write access", () => {
  it("anonymous visitors cannot write", async () => {
    const { error } = await anon.from("rowers").insert({ name: "anon", side: "port" });
    expect(error).not.toBeNull();
  });

  it("a non-coach cannot create sessions, lineups, rowers, or availability", async () => {
    const attempts = await Promise.all([
      viewer.from("sessions").insert({ session_date: "2099-01-02", slot: "AM" }),
      viewer.from("lineups").insert({ session_id: sessionId, name: "Nope" }),
      viewer.from("rowers").insert({ name: "Nope", side: "port" }),
      viewer.from("availability").insert({ rower_id: rowerId, session_id: sessionId, status: "out" }),
      viewer.from("session_notes").insert({ session_id: sessionId, coach_id: users.viewer.id, body: "hi" }),
    ]);
    for (const { error } of attempts) expect(error?.code).toBe("42501");
  });

  it("a non-coach cannot update or delete existing rows", async () => {
    const { data: updated } = await viewer
      .from("sessions")
      .update({ title: "hacked" })
      .eq("id", sessionId)
      .select("id");
    expect(updated).toEqual([]);
    const { data: deleted } = await viewer.from("rowers").delete().eq("id", rowerId).select("id");
    expect(deleted).toEqual([]);
    const { data: still } = await admin.from("sessions").select("title").eq("id", sessionId).single();
    expect(still!.title).toBe(`rls-${suffix}`);
  });

  it("a coach can create and edit lineups and seat assignments", async () => {
    const { data: lineup, error } = await coachA
      .from("lineups")
      .insert({ session_id: sessionId, name: "Piece 1", is_primary: true })
      .select("id")
      .single();
    expect(error).toBeNull();
    const { error: seatErr } = await coachA
      .from("seat_assignments")
      .insert({ lineup_id: lineup!.id, boat_number: 1, seat: "stroke", rower_id: rowerId });
    expect(seatErr).toBeNull();
    const { data: renamed } = await coachB
      .from("lineups")
      .update({ name: "Piece 1b" })
      .eq("id", lineup!.id)
      .select("name")
      .single();
    expect(renamed!.name).toBe("Piece 1b");
  });

  it("clone_lineup copies seats for a coach and is refused for a non-coach", async () => {
    const { data: source } = await coachA.from("lineups").select("id").eq("session_id", sessionId).single();
    const { data: newId, error } = await coachA.rpc("clone_lineup", {
      source_lineup_id: source!.id,
      new_name: "Piece 2",
    });
    expect(error).toBeNull();
    const { data: seats } = await anon.from("seat_assignments").select("seat").eq("lineup_id", newId);
    expect(seats).toEqual([{ seat: "stroke" }]);

    const { error: viewerErr } = await viewer.rpc("clone_lineup", { source_lineup_id: source!.id, new_name: "x" });
    expect(viewerErr).not.toBeNull();
  });

  it("assign_seat moves, swaps, and unseats atomically", async () => {
    const { data: lineup } = await coachA
      .from("lineups")
      .select("id")
      .eq("session_id", sessionId)
      .order("position")
      .limit(1)
      .single();
    const { data: other } = await admin
      .from("rowers")
      .insert({ name: `RLS Rower 2 ${suffix}`, side: "starboard" })
      .select("id")
      .single();
    try {
      // rowerId currently sits at 1:stroke. Seat `other` at 1:7, then swap by dropping `other` onto stroke.
      let res = await coachA.rpc("assign_seat", {
        p_lineup_id: lineup!.id,
        p_rower_id: other!.id,
        p_boat: 1,
        p_seat: "7",
      });
      expect(res.error).toBeNull();
      res = await coachA.rpc("assign_seat", {
        p_lineup_id: lineup!.id,
        p_rower_id: other!.id,
        p_boat: 1,
        p_seat: "stroke",
      });
      expect(res.error).toBeNull();
      const { data: seats } = await anon
        .from("seat_assignments")
        .select("seat, rower_id")
        .eq("lineup_id", lineup!.id)
        .order("seat");
      expect(seats).toEqual(
        expect.arrayContaining([
          { seat: "stroke", rower_id: other!.id },
          { seat: "7", rower_id: rowerId },
        ]),
      );
      expect(seats).toHaveLength(2);

      // Non-coach cannot seat anyone.
      const denied = await viewer.rpc("assign_seat", {
        p_lineup_id: lineup!.id,
        p_rower_id: other!.id,
        p_boat: 2,
        p_seat: "bow",
      });
      expect(denied.error).not.toBeNull();

      res = await coachB.rpc("unassign_seat", { p_lineup_id: lineup!.id, p_rower_id: other!.id });
      expect(res.error).toBeNull();
      const { data: after } = await anon.from("seat_assignments").select("rower_id").eq("lineup_id", lineup!.id);
      expect(after).toEqual([{ rower_id: rowerId }]);
    } finally {
      await admin.from("rowers").delete().eq("id", other!.id);
    }
  });

  it("set_primary_lineup keeps exactly one primary lineup per session", async () => {
    const { data: lineups } = await coachA
      .from("lineups")
      .select("id, is_primary")
      .eq("session_id", sessionId)
      .order("position");
    const secondary = lineups!.find((l) => !l.is_primary)!;
    const { error } = await coachB.rpc("set_primary_lineup", { target_lineup_id: secondary.id });
    expect(error).toBeNull();
    const { data: after } = await anon.from("lineups").select("id, is_primary").eq("session_id", sessionId);
    expect(after!.filter((l) => l.is_primary).map((l) => l.id)).toEqual([secondary.id]);
  });
});

describe("session notes", () => {
  it("a coach can write their own note", async () => {
    const { error } = await coachA
      .from("session_notes")
      .insert({ session_id: sessionId, coach_id: users.coachA.id, body: "A's note" });
    expect(error).toBeNull();
  });

  it("a coach cannot insert a note attributed to another coach", async () => {
    const { error } = await coachB
      .from("session_notes")
      .insert({ session_id: sessionId, coach_id: users.coachA.id, body: "forged" });
    expect(error?.code).toBe("42501");
  });

  it("a coach cannot edit or delete another coach's note", async () => {
    const { data: note } = await admin
      .from("session_notes")
      .select("id, body")
      .eq("session_id", sessionId)
      .eq("coach_id", users.coachA.id)
      .single();
    const { data: updated } = await coachB.from("session_notes").update({ body: "edited by B" }).eq("id", note!.id).select("id");
    expect(updated).toEqual([]);
    const { data: deleted } = await coachB.from("session_notes").delete().eq("id", note!.id).select("id");
    expect(deleted).toEqual([]);
    const { data: unchanged } = await admin.from("session_notes").select("body").eq("id", note!.id).single();
    expect(unchanged!.body).toBe("A's note");
  });

  it("a coach can edit their own note and updated_at advances", async () => {
    const { data: before } = await admin
      .from("session_notes")
      .select("id, updated_at")
      .eq("session_id", sessionId)
      .eq("coach_id", users.coachA.id)
      .single();
    await new Promise((r) => setTimeout(r, 20));
    const { data: after, error } = await coachA
      .from("session_notes")
      .update({ body: "A's revised note" })
      .eq("id", before!.id)
      .select("body, updated_at")
      .single();
    expect(error).toBeNull();
    expect(after!.body).toBe("A's revised note");
    expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(new Date(before!.updated_at).getTime());
  });

  it("everyone can read all coaches' notes", async () => {
    const { data } = await anon.from("session_notes").select("coach_id").eq("session_id", sessionId);
    expect(data?.map((n) => n.coach_id)).toEqual([users.coachA.id]);
  });
});

describe("coaches table", () => {
  it("a signed-in non-coach cannot promote themselves to coach", async () => {
    const { error } = await viewer.from("coaches").insert({ id: users.viewer.id, name: "Sneaky" });
    expect(error?.code).toBe("42501");
  });

  it("a coach cannot rename another coach", async () => {
    const { data } = await coachB.from("coaches").update({ name: "Renamed" }).eq("id", users.coachA.id).select("id");
    expect(data).toEqual([]);
  });
});
