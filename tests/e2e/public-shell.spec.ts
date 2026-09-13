import { expect, test } from "@playwright/test";

test("landing and legal pages are usable", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /turn “where should we eat\?” into a two-minute vote/i,
    }),
  ).toBeVisible();
  // The landing now offers this CTA twice: in the hero and in the closing band.
  const createPollLinks = page.getByRole("link", { name: "Create a lunch poll" });
  await expect(createPollLinks).toHaveCount(2);
  for (const link of await createPollLinks.all()) {
    await expect(link).toHaveAttribute("href", "/admin/login");
  }

  await page.getByRole("link", { name: "Privacy" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Privacy at LunchPick" })).toBeVisible();
});

test("health endpoint is uncached", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["cache-control"]).toBe("no-store");
  await expect(response.json()).resolves.toMatchObject({
    status: "ok",
    service: "restaurant-voter",
  });
});
