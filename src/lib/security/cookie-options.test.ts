import { describe, expect, it } from "vitest";

import {
  createSecureCookieOptions,
  shouldUseSecureCookies,
} from "@/lib/security/cookie-options";

describe("security cookie options", () => {
  it("supports local HTTP while requiring Secure on production HTTPS", () => {
    expect(shouldUseSecureCookies("http://localhost:3000")).toBe(false);
    expect(shouldUseSecureCookies("https://restaurant.example")).toBe(true);
  });

  it("sets HttpOnly, SameSite, path, and a bounded lifetime", () => {
    const now = new Date("2026-08-05T12:00:00.000Z");
    const expiresAt = Math.floor(now.getTime() / 1_000) + 60;
    const options = createSecureCookieOptions(
      expiresAt,
      now,
      "https://restaurant.example",
    );

    expect(options).toMatchObject({
      httpOnly: true,
      maxAge: 60,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  });
});
