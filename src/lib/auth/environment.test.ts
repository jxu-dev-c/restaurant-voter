import { describe, expect, it } from "vitest";

import {
  EnvironmentConfigurationError,
  parsePublicEnvironment,
  parseServerEnvironment,
} from "@/lib/env";

describe("environment validation", () => {
  it("reports all missing server configuration with actionable names", () => {
    let thrown: unknown;

    try {
      parseServerEnvironment({});
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(EnvironmentConfigurationError);
    expect(String(thrown)).toContain("NEXT_PUBLIC_APP_URL");
    expect(String(thrown)).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(String(thrown)).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(String(thrown)).toContain("REFERRAL_SIGNING_SECRET");
    expect(String(thrown)).toContain("COOKIE_SIGNING_SECRET");
    expect(String(thrown)).toContain("DEVICE_HASH_SECRET");
  });

  it("accepts legacy Supabase and application URL fallbacks", () => {
    expect(
      parsePublicEnvironment({
        APP_URL: "http://localhost:3000/",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy-anon-key",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co/",
      }),
    ).toMatchObject({
      appUrl: "http://localhost:3000",
      supabasePublishableKey: "legacy-anon-key",
      supabaseUrl: "https://project.supabase.co",
    });
  });

  it("keeps Google configuration optional and prefers the current key names", () => {
    const parsed = parseServerEnvironment({
      COOKIE_SIGNING_SECRET: "c".repeat(32),
      DEVICE_HASH_SECRET: "d".repeat(32),
      GOOGLE_MAPS_SERVER_KEY: "server-key",
      NEXT_PUBLIC_APP_URL: "https://restaurant.example",
      NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY: "browser-key",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      REFERRAL_SIGNING_SECRET: "r".repeat(32),
      SUPABASE_SECRET_KEY: "modern-secret-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    });

    expect(parsed.googleMapsBrowserKey).toBe("browser-key");
    expect(parsed.googleMapsServerKey).toBe("server-key");
    expect(parsed.googlePlacesApiKey).toBe("server-key");
    expect(parsed.googleRoutesApiKey).toBe("server-key");
    expect(parsed.supabaseServiceRoleKey).toBe("modern-secret-key");
  });
});
