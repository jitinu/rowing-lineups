/**
 * Seeds a Supabase project with 3 coaches, 36 rowers (32 sweep + 4 coxswains),
 * and one example session whose two lineups differ by a single same-boat swap.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).
 * Safe to re-run: existing seed data is removed first.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

import { ROWING_SEATS, STANDARD_RIGGING, type Side } from "../src/domain/types";

config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

export const SEED_COACHES = [
  { email: "coach1@example.com", password: "password123", name: "Coach Avery" },
  { email: "coach2@example.com", password: "password123", name: "Coach Blake" },
  { email: "coach3@example.com", password: "password123", name: "Coach Casey" },
];

const FIRST = [
  "Owen", "Liam", "Noah", "Ethan", "Mason", "Lucas", "Henry", "Jack",
  "Leo", "Miles", "Theo", "Felix", "Hugo", "Oscar", "Rhys", "Kai",
  "Jonah", "Silas", "Ezra", "Caleb", "Wyatt", "Elias", "Reid", "Cole",
  "Finn", "Beau", "Otis", "Jude", "Ames", "Tate", "Ward", "Nash",
];
const LAST = [
  "Hale", "Park", "Reyes", "Okafor", "Lindqvist", "Byrne", "Tanaka", "Moreau",
  "Novak", "Singh", "Delgado", "Kowalski", "Brennan", "Haddad", "Ivers", "Sato",
  "Costa", "Weber", "Nguyen", "Fischer", "Dube", "Larsen", "Quinn", "Adeyemi",
  "Marsh", "Rowe", "Petrov", "Achebe", "Holm", "Gallo", "Pham", "Kerr",
];

function sideFor(i: number): Side {
  if (i % 8 === 7) return "both";
  return i % 2 === 0 ? "starboard" : "port";
}

async function ensureCoach(c: (typeof SEED_COACHES)[number]) {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = list?.users.find((u) => u.email === c.email);
  let id = existing?.id;
  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({
      email: c.email,
      password: c.password,
      email_confirm: true,
      user_metadata: { name: c.name },
    });
    if (error) throw error;
    id = data.user.id;
  }
  const { error } = await admin.from("coaches").upsert({ id, name: c.name });
  if (error) throw error;
  return id;
}

async function main() {
  const coachIds: string[] = [];
  for (const c of SEED_COACHES) coachIds.push(await ensureCoach(c));

  for (const table of ["sessions", "rowers"] as const) {
    const { error } = await admin.from(table).delete().not("id", "is", null);
    if (error) throw error;
  }

  const rowers = FIRST.map((first, i) => ({
    name: `${first} ${LAST[i]}`,
    side: sideFor(i),
    weight_kg: 72 + ((i * 7) % 23) + (i % 3) * 0.5,
    class_year: 2026 + (i % 4),
    is_coxswain: false,
    active: true,
    squad: i < 16 ? "Varsity" : "JV",
    can_steer: false,
  }));
  const coxswains = ["Maya Chen", "Priya Nair", "Sofia Ruiz", "June Kim"].map((name, i) => ({
    name,
    side: "both" as Side,
    weight_kg: 50 + i,
    class_year: 2026 + (i % 3),
    is_coxswain: true,
    active: true,
    squad: i < 2 ? "Varsity" : "JV",
    can_steer: true,
  }));
  const { data: inserted, error: rowerErr } = await admin
    .from("rowers")
    .insert([...rowers, ...coxswains])
    .select("id, name, is_coxswain, active");
  if (rowerErr) throw rowerErr;

  const sweep = inserted.filter((r) => !r.is_coxswain && r.active);
  const cox = inserted.filter((r) => r.is_coxswain);

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const { data: session, error: sessErr } = await admin
    .from("sessions")
    .insert({ session_date: dateStr, slot: "AM", title: "Steady state + pieces", created_by: coachIds[0] })
    .select("id")
    .single();
  if (sessErr) throw sessErr;

  const { data: lineups, error: lineupErr } = await admin
    .from("lineups")
    .insert([
      { session_id: session.id, name: "Piece 1", position: 0, is_primary: true, created_by: coachIds[0] },
      { session_id: session.id, name: "Piece 2", position: 1, is_primary: false, created_by: coachIds[1] },
    ])
    .select("id, name")
    .order("name");
  if (lineupErr) throw lineupErr;

  // Fill seats so that each seat gets a rower of the matching side where possible.
  const bySide = {
    port: sweep.filter((r) => rowers.find((x) => x.name === r.name)?.side === "port"),
    starboard: sweep.filter((r) => rowers.find((x) => x.name === r.name)?.side === "starboard"),
    both: sweep.filter((r) => rowers.find((x) => x.name === r.name)?.side === "both"),
  };
  const pick = (side: "port" | "starboard") => bySide[side].shift() ?? bySide.both.shift();

  const base: { boat_number: number; seat: string; rower_id: string }[] = [];
  for (const boat of [1, 2, 3, 4]) {
    for (const seat of ROWING_SEATS) {
      const r = pick(STANDARD_RIGGING[seat]);
      if (r) base.push({ boat_number: boat, seat, rower_id: r.id });
    }
    base.push({ boat_number: boat, seat: "cox", rower_id: cox[boat - 1].id });
  }

  const swapped = base.map((a) => ({ ...a }));
  const five = swapped.find((a) => a.boat_number === 1 && a.seat === "5")!;
  const six = swapped.find((a) => a.boat_number === 1 && a.seat === "6")!;
  [five.rower_id, six.rower_id] = [six.rower_id, five.rower_id];

  const piece1 = lineups.find((l) => l.name === "Piece 1")!;
  const piece2 = lineups.find((l) => l.name === "Piece 2")!;
  const { error: seatErr } = await admin.from("seat_assignments").insert([
    ...base.map((a) => ({ ...a, lineup_id: piece1.id })),
    ...swapped.map((a) => ({ ...a, lineup_id: piece2.id })),
  ]);
  if (seatErr) throw seatErr;

  const { error: noteErr } = await admin.from("session_notes").insert([
    { session_id: session.id, coach_id: coachIds[0], body: "Piece 2 tests the 5/6 swap in the 1V." },
    { session_id: session.id, coach_id: coachIds[1], body: "Watch catch timing in the 2V through the turn." },
  ]);
  if (noteErr) throw noteErr;

  const limited = sweep[sweep.length - 1];
  const { error: availErr } = await admin
    .from("availability")
    .insert({ rower_id: limited.id, session_id: session.id, status: "limited", reason: "Back" });
  if (availErr) throw availErr;

  console.log(`Seeded ${inserted.length} rowers, ${coachIds.length} coaches, session ${dateStr} AM with 2 lineups.`);
  console.log("Coach logins: coach1@example.com / coach2@example.com / coach3@example.com, password: password123");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
