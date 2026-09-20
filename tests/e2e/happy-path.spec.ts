import { createClient } from "@supabase/supabase-js";
import { expect, type Locator, type Page, test } from "@playwright/test";

const COACH = { email: process.env.E2E_COACH_EMAIL ?? "coach1@example.com", password: process.env.E2E_COACH_PASSWORD ?? "password123" };

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for e2e cleanup");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** A date far enough out that it cannot collide with seeded or coach-created sessions. */
function freshDate() {
  const d = new Date(Date.UTC(2090, 0, 1) + Math.floor(Math.random() * 3000) * 86_400_000);
  return d.toISOString().slice(0, 10);
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(COACH.email);
  await page.getByLabel("Password").fill(COACH.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/sessions");
}

function boat(page: Page, n: number) {
  return page.locator(`[data-lineup-id] [data-boat="${n}"]`);
}

function seat(page: Page, b: number, s: string) {
  return boat(page, b).locator(`[data-seat="${b}:${s}"]`);
}

function rosterChip(page: Page, name: string) {
  return page.getByRole("complementary", { name: "Roster" }).locator("[data-rower-chip]", { hasText: name });
}

/** Tap to place: select a chip, then tap the target seat. Works on phone and laptop. */
async function tapPlace(page: Page, chip: Locator, b: number, s: string) {
  await chip.click();
  const target = seat(page, b, s);
  const empty = target.getByRole("button", { name: /Empty/ });
  if (await empty.count()) await empty.click();
  else await target.locator("[data-rower-chip]").click();
}

async function dragPlace(page: Page, chip: Locator, b: number, s: string) {
  const from = await chip.boundingBox();
  const to = await seat(page, b, s).boundingBox();
  if (!from || !to) throw new Error("drag targets not visible");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 10, from.y + 10, { steps: 3 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
}

test.describe("happy path", () => {
  const date = freshDate();
  const created: string[] = [];

  test.afterAll(async () => {
    if (created.length === 0) return;
    await admin().from("sessions").delete().in("id", created);
  });

  test("create session, build lineup, clone, swap, compare", async ({ page }, testInfo) => {
    await signIn(page);

    // Create session
    await page.getByRole("button", { name: "Session" }).click();
    await page.getByLabel("Date").fill(date);
    await page.getByLabel("Slot").selectOption("PM");
    await page.getByLabel("Title").fill("E2E");
    await page.getByRole("button", { name: "Create" }).click();
    await page.waitForURL(/\/sessions\/[0-9a-f-]{36}$/);
    created.push(page.url().split("/").pop()!);

    // Fresh session comes with Piece 1
    const tabs = page.getByRole("tablist", { name: "Lineups" });
    await expect(tabs.getByRole("tab", { name: /Piece 1/ })).toHaveAttribute("aria-selected", "true");
    await expect(boat(page, 1)).toBeVisible();

    // Build: seat three rowers in boat 1
    const roster = page.getByRole("complementary", { name: "Roster" });
    const names = await roster.locator("[data-rower-chip] > span.truncate").allInnerTexts();
    const [r1, r2, r3] = names.filter((n) => n.trim()).slice(0, 3);
    expect(r3).toBeTruthy();

    if (testInfo.project.name === "laptop") await dragPlace(page, rosterChip(page, r1), 1, "stroke");
    else await tapPlace(page, rosterChip(page, r1), 1, "stroke");
    await expect(seat(page, 1, "stroke")).toContainText(r1);

    await tapPlace(page, rosterChip(page, r2), 1, "7");
    await expect(seat(page, 1, "7")).toContainText(r2);
    await tapPlace(page, rosterChip(page, r3), 1, "6");
    await expect(seat(page, 1, "6")).toContainText(r3);

    // Validation is non-blocking: boat 1 still reports open seats
    await expect(boat(page, 1)).toContainText("5 open");
    await expect(boat(page, 1).locator('[data-flag="missing_cox"]')).toBeVisible();

    // Re-rig: move the 6 oar to starboard, then restore the standard rig
    await expect(boat(page, 1)).toHaveAttribute("data-rig", "standard");
    await seat(page, 1, "6").getByRole("button", { name: /move oar to starboard/ }).click();
    await expect(boat(page, 1)).toHaveAttribute("data-rig", "custom");
    await expect(seat(page, 1, "6").getByRole("button", { name: /move oar to port/ })).toBeVisible();
    await boat(page, 1).getByRole("button", { name: "Rigging, boat 1" }).click();
    await page.getByRole("menuitem", { name: "Standard rig" }).click();
    await expect(boat(page, 1)).toHaveAttribute("data-rig", "standard");

    const pieceOneId = await page.locator("[data-lineup-id]").getAttribute("data-lineup-id");
    expect(pieceOneId).toBeTruthy();

    // Clone
    await page.getByRole("button", { name: "Clone" }).click();
    const cloneTab = tabs.getByRole("tab", { name: /Piece 1 copy/ });
    await expect(cloneTab).toHaveAttribute("aria-selected", "true");
    await expect(seat(page, 1, "stroke")).toContainText(r1);
    const cloneId = await page.locator("[data-lineup-id]").getAttribute("data-lineup-id");
    expect(cloneId).toBeTruthy();
    expect(cloneId).not.toBe(pieceOneId);

    // Swap stroke and 7 in the clone: select the stroke chip, tap the 7 seat
    await tapPlace(page, seat(page, 1, "stroke").locator("[data-rower-chip]"), 1, "7");
    await expect(seat(page, 1, "7")).toContainText(r1);
    await expect(seat(page, 1, "stroke")).toContainText(r2);
    await expect(seat(page, 1, "6")).toContainText(r3);

    // Compare Piece 1 -> clone and see the paired swap
    await page.goto(`/compare?a=${pieceOneId}&b=${cloneId}`);
    const diff = page.getByTestId("diff-view");
    await expect(diff).toBeVisible();
    const swaps = diff.locator('[data-change="swap"]');
    await expect(swaps).toHaveCount(1);
    await expect(diff.locator('[data-change="move"]')).toHaveCount(0);
    await expect(diff.locator('[data-change="add"]')).toHaveCount(0);
    await expect(diff.locator('[data-change="drop"]')).toHaveCount(0);
    await expect(swaps.first()).toContainText(r1);
    await expect(swaps.first()).toContainText(r2);
    await expect(diff.locator('[data-boat="1"]')).toContainText(r1);
    for (const b of [2, 3, 4]) await expect(diff.locator(`[data-boat="${b}"]`)).toContainText("No changes");
  });
});
