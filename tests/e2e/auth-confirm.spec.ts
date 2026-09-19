import { expect, test } from "@playwright/test";

test("native confirmation forms preserve Origin without leaking the token in Referer", async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  // Capture the browser-generated request, not a manually supplied Origin.
  // No real credential or Supabase connection is needed for this regression.
  await page.route("**/auth/callback", async (route) => {
    await route.fulfill({ status: 200, contentType: "text/plain", body: "Confirmation submitted" });
  });
  const response = await page.goto("/auth/confirm?token_hash=test-token&type=email");
  expect(response?.headers()["referrer-policy"]).toBe("strict-origin");
  const submitted = page.waitForRequest((request) => request.url() === `${origin}/auth/callback` && request.method() === "POST");
  await page.getByRole("button", { name: "Continue to LunchPick", exact: true }).click();
  const request = await submitted;
  expect(request.headers()["origin"]).toBe(origin);
  expect(request.headers()["referer"]).toBe(`${origin}/`);
  expect(new URLSearchParams(request.postData()!).get("token_hash")).toBe("test-token");
});
