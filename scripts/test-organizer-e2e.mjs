import { execFileSync, spawnSync } from "node:child_process";

const status = JSON.parse(execFileSync("pnpm", ["exec", "supabase", "status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3107";
for (const url of [status.API_URL, baseURL]) {
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
    throw new Error("Organizer integration tests require local application and Supabase URLs");
  }
}

const result = spawnSync("pnpm", ["exec", "playwright", "test", "tests/e2e/organizer-accounts.spec.ts", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    PLAYWRIGHT_BASE_URL: baseURL,
    NEXT_PUBLIC_APP_URL: baseURL,
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: status.SECRET_KEY,
    E2E_SUPABASE_URL: status.API_URL,
    E2E_SUPABASE_SECRET_KEY: status.SECRET_KEY,
    REFERRAL_SIGNING_SECRET: "local-e2e-referral-secret-at-least-32-characters",
    COOKIE_SIGNING_SECRET: "local-e2e-cookie-secret-at-least-32-characters",
    DEVICE_HASH_SECRET: "local-e2e-device-secret-at-least-32-characters",
    NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY: "",
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "",
    GOOGLE_MAPS_SERVER_KEY: "",
  },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
