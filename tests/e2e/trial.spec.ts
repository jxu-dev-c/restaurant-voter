import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const localUrl = process.env.E2E_SUPABASE_URL;
const localKey = process.env.E2E_SUPABASE_SECRET_KEY;
test("trial organizers create and share polls; voters save and edit ballots", async ({ page, browser, baseURL }) => {
  test.setTimeout(90_000);
  test.skip(!localUrl || !localKey, "Requires local Supabase integration credentials");
  expect(new URL(localUrl!).hostname).toMatch(/^(127\.0\.0\.1|localhost)$/);
  const db = createClient(localUrl!, localKey!, { auth: { persistSession: false } });
  const title = `Trial integration ${randomUUID()}`;
  await page.goto("/");
  await page.getByRole("button", { name: "Try as an organizer" }).click();
  await expect(page.getByRole("heading", { name: "Lunch polls", exact: true })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Trial workspace" })).toBeVisible();
  await page.goto("/admin/polls/new");
  await page.getByLabel("Poll title").fill(title);
  await page.getByLabel("Lunch center").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Create draft poll" }).click();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  const pollId = new URL(page.url()).pathname.split("/").pop()!;
  const { data: created } = await db.from("polls").select("team_id,owner_id").eq("id", pollId).single();
  expect(created).toMatchObject({ team_id: "00000000-0000-4000-8000-00000000ff01", owner_id: null });
  // The integration runner has no Google key; supply an authored candidate
  // through the same transactional RPC used by organizer nominations.
  const { error: candidateError } = await db.rpc("seed_poll_candidate", {
    p_poll_id: pollId, p_admin_email: "trial@lunchpick.invalid",
    p_google_place_id: "lunchpick-trial-sample-1", p_fallback_label: "Harbour Tacos",
  });
  expect(candidateError).toBeNull();
  await page.reload();
  await page.getByRole("button", { name: "Open nominations" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open voting" })).toBeVisible();
  await page.getByRole("link", { name: "Share & settings" }).click();
  const referral = await page.locator("[data-referral-url]").getAttribute("data-referral-url");
  expect(referral).toContain("/join/");
  expect(new URL(referral!).origin).toBe(new URL(baseURL!).origin);
  const voterContext = await browser.newContext();
  try {
    const voter = await voterContext.newPage();
    await voter.goto(referral!);
    await expect(voter.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(voter.getByRole("complementary", { name: "Trial workspace" })).toBeVisible();
    await voter.goto(baseURL!);
    await voter.getByRole("button", { name: "Try voting", exact: true }).click();
    await expect(voter.getByLabel("Your display name")).toBeVisible();
    await voter.getByLabel("Your display name").fill(`Visitor ${randomUUID().slice(0, 8)}`);
    await voter.getByRole("button", { name: "Join this poll" }).click();
    await expect(voter.getByRole("checkbox")).toHaveCount(4);
    await expect(voter.getByText("Fictional sample restaurant", { exact: true })).toHaveCount(4);
    await expect(voter.getByText(/drive$/).first()).toBeVisible();
    await voter.locator(".select-card").first().click();
    await expect(voter.getByRole("checkbox").first()).toBeChecked();
    await voter.getByRole("button", { name: "Save ballot" }).click();
    await expect(voter.getByRole("heading", { name: "Vote saved" })).toBeVisible();
    await voter.getByRole("button", { name: "Done", exact: true }).click();
    await voter.locator(".select-card").nth(1).click();
    await expect(voter.getByRole("checkbox").nth(1)).toBeChecked();
    await voter.getByRole("button", { name: "Save ballot" }).click();
    await expect(voter.getByRole("heading", { name: "Vote saved" })).toBeVisible();
    await voter.reload();
    await expect(voter.getByRole("checkbox").first()).toBeChecked();
    await expect(voter.getByRole("checkbox").nth(1)).toBeChecked();
    await expect(voter.getByRole("link", { name: "New poll" })).toHaveCount(0);
  } finally {
    await voterContext.close().catch(() => {});
  }
  await page.getByRole("button", { name: "Leave trial", exact: true }).click();
  await expect(page).toHaveURL(baseURL! + "/");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/auth\/login/);
});

test("trial mode preserves a normal sign-in and blocks access after trial expiry", async ({ page, context, baseURL }) => {
  test.setTimeout(90_000);
  test.skip(!localUrl || !localKey, "Requires local Supabase integration credentials");
  expect(new URL(localUrl!).hostname).toMatch(/^(127\.0\.0\.1|localhost)$/);
  const db = createClient(localUrl!, localKey!, { auth: { persistSession: false } });
  const teamId = randomUUID();
  const pollId = randomUUID();
  const email = `trial-isolation-${teamId}@example.com`;
  let userId: string | undefined;
  try {
    const { error: teamError } = await db.from("teams").insert({ id: teamId, slug: `trial-isolation-${teamId}`, name: "Normal test team" });
    expect(teamError).toBeNull();
    const { error: allowlistError } = await db.from("organizer_email_allowlist").insert({ email, team_id: teamId });
    expect(allowlistError).toBeNull();
    const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
    expect(error).toBeNull();
    userId = data.user!.id;
    const { error: pollError } = await db.from("polls").insert({
      id: pollId, title: "Private normal team poll", center_name: "Normal office",
      center_latitude: 44, center_longitude: -63, created_by_admin: email, team_id: teamId,
    });
    expect(pollError).toBeNull();
    await page.goto(`${baseURL}/auth/callback?token_hash=${data.properties!.hashed_token}&type=${data.properties!.verification_type}`);
    await page.getByRole("button", { name: "Continue to LunchPick" }).click();
    await expect(page.getByText("Private normal team poll", { exact: true })).toBeVisible();
    const { data: before } = await db.from("polls").select("*").eq("id", pollId).single();
    await page.goto("/");
    await page.getByRole("button", { name: "Try as an organizer" }).click();
    await expect(page.getByRole("complementary", { name: "Trial workspace" })).toBeVisible();
    await expect(page.getByText("Private normal team poll", { exact: true })).toHaveCount(0);
    await page.goto(`/admin/polls/${pollId}`);
    await expect(page.getByRole("heading", { name: "Private normal team poll", exact: true })).toHaveCount(0);
    const cookie = (await context.cookies()).find((value) => value.name === "rv_trial_organizer")!;
    await context.addCookies([{ ...cookie, value: cookie.value + "invalid" }]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/trial\/expired/);
    await page.getByRole("button", { name: "Leave trial", exact: true }).click();
    await expect(page).toHaveURL(baseURL! + "/");
    await page.goto("/admin");
    await expect(page.getByText("Private normal team poll", { exact: true })).toBeVisible();
    const { data: after } = await db.from("polls").select("*").eq("id", pollId).single();
    expect(after).toEqual(before);
  } finally {
    const { error: pollError } = await db.from("polls").delete().eq("id", pollId).eq("team_id", teamId);
    expect(pollError).toBeNull();
    if (userId) expect((await db.auth.admin.deleteUser(userId)).error).toBeNull();
    expect((await db.from("organizer_email_allowlist").delete().eq("email", email)).error).toBeNull();
    expect((await db.from("teams").delete().eq("id", teamId)).error).toBeNull();
  }
});
