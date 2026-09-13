import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

// This integration test is opt-in and deliberately restricted to local Supabase.
const localUrl = process.env.E2E_SUPABASE_URL;
const localKey = process.env.E2E_SUPABASE_SECRET_KEY;

test("organizers on the same team can view and manage each other's polls", async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(!localUrl || !localKey, "Requires local Supabase integration credentials");
  expect(new URL(localUrl!).hostname).toMatch(/^(127\.0\.0\.1|localhost)$/);
  const admin = createClient(localUrl!, localKey!, { auth: { persistSession: false } });
  const suffix = randomUUID();
  const teamId = randomUUID();
  const users: string[] = [];
  const emails: string[] = [];
  const contexts = [];

  try {
    const { error: blockedSignupError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: `blocked-${suffix}@example.com`,
    });
    expect(blockedSignupError?.status).toBe(403);

    emails.push(
      `organizer-a-${suffix}@example.com`,
      `organizer-b-${suffix}@example.com`,
    );
    const { error: teamError } = await admin
      .from("teams")
      .insert({ id: teamId, slug: `e2e-${suffix}`, name: `E2E team ${suffix}` });
    expect(teamError).toBeNull();
    const { error: allowlistError } = await admin
      .from("organizer_email_allowlist")
      .insert(emails.map((email) => ({ email, team_id: teamId, note: "Playwright organizer team test" })));
    expect(allowlistError).toBeNull();

    for (const label of ["A", "B"]) {
      const email = emails[label === "A" ? 0 : 1];
      const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
      expect(error).toBeNull();
      users.push(data.user!.id);
      const device = testInfo.project.use;
      const context = await browser.newContext({
        viewport: device.viewport,
        userAgent: device.userAgent,
        deviceScaleFactor: device.deviceScaleFactor,
        isMobile: device.isMobile,
        hasTouch: device.hasTouch,
      });
      contexts.push(context);
      const page = await context.newPage();
      // Exercise the actual callback, verified session cookie, and organizer layout.
      await page.goto(`${baseURL}/auth/callback?token_hash=${data.properties!.hashed_token}&type=${data.properties!.verification_type}`);
      await expect(page.getByRole("heading", { name: "Lunch polls", exact: true })).toBeVisible();
      const teamIdentity = device.isMobile
        ? page.locator(".admin-mobile-team")
        : page.locator(".admin-sidebar");
      await expect(teamIdentity.getByText(`E2E team ${suffix}`, { exact: true })).toBeVisible();
      if (label === "A") {
        await expect(page.getByRole("heading", { name: "No lunch polls yet" })).toBeVisible();
      } else {
        await expect(page.getByText(`A lunch ${suffix}`, { exact: true })).toBeVisible();
      }
      await page.goto(`${baseURL}/admin/centers`);
      await page.getByLabel("Center name").fill(`${label} office ${suffix}`);
      await page.getByLabel("Latitude", { exact: true }).fill("44.6488");
      await page.getByLabel("Longitude", { exact: true }).fill("-63.5752");
      await page.getByRole("button", { name: "Add lunch center" }).click();
      await expect(page.getByRole("heading", { name: `${label} office ${suffix}`, exact: true })).toBeVisible();
      await page.goto(`${baseURL}/admin/polls/new`);
      await expect(page.getByLabel("Lunch center").locator("option")).toHaveCount(label === "A" ? 2 : 3);
      await page.getByLabel("Poll title").fill(`${label} lunch ${suffix}`);
      await page.getByLabel("Lunch center").selectOption({ label: `${label} office ${suffix}` });
      await page.getByRole("button", { name: "Create draft poll" }).click();
      await expect(page.getByRole("heading", { name: `${label} lunch ${suffix}`, exact: true })).toBeVisible();
    }

    const pageA = contexts[0].pages()[0];
    const pageB = contexts[1].pages()[0];
    const pollAUrl = pageA.url();
    const pollBUrl = pageB.url();
    for (const [page, own, otherUrl, other] of [[pageA, "A", pollBUrl, "B"], [pageB, "B", pollAUrl, "A"]] as const) {
      await page.goto(`${baseURL}/admin`);
      await expect(page.getByText(`${own} lunch ${suffix}`, { exact: true })).toBeVisible();
      await expect(page.getByText(`${other} lunch ${suffix}`, { exact: true })).toBeVisible();
      await page.goto(otherUrl);
      await expect(page.getByRole("heading", { name: `${other} lunch ${suffix}`, exact: true })).toBeVisible();
    }

    // Organizer B can manage a poll created by organizer A.
    await pageB.goto(pollAUrl);
    await pageB.getByRole("link", { name: "Share & settings" }).click();
    await pageB.getByRole("button", { name: "Duplicate as a new draft" }).click();
    await expect(pageB.getByRole("heading", { name: `A lunch ${suffix} (copy)`, exact: true })).toBeVisible();
    await pageA.getByRole("button", { name: "Sign out" }).click();
    await expect(pageA).toHaveURL(/\/auth\/login/);
    await pageA.goto(pollAUrl);
    await expect(pageA).toHaveURL(/\/auth\/login/);
  } finally {
    for (const context of contexts) await context.close();
    // Only empty draft records created by this test are removed. No DB reset.
    for (const id of users) {
      const { error: pollError } = await admin.from("polls").delete().eq("owner_id", id);
      expect(pollError).toBeNull();
    }
    for (const id of users) {
      const { error: centerError } = await admin.from("lunch_centers").delete().eq("owner_id", id);
      expect(centerError).toBeNull();
    }
    for (const id of users) {
      const { error } = await admin.auth.admin.deleteUser(id);
      expect(error).toBeNull();
    }
    const { error: allowlistError } = await admin
      .from("organizer_email_allowlist")
      .delete()
      .in("email", emails);
    expect(allowlistError).toBeNull();
    const { error: teamError } = await admin.from("teams").delete().eq("id", teamId);
    expect(teamError).toBeNull();
  }
});
