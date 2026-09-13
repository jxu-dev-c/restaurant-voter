import { describe, expect, it } from "vitest";

import { normalizeEmail } from "@/lib/auth/admin-email";
import { sanitizeReturnPath } from "@/lib/auth/return-path";

describe("email normalization", () => {
  it("normalizes email addresses", () => {
    expect(normalizeEmail("  ADMIN@Example.COM ")).toBe("admin@example.com");
  });

  it("rejects malformed email values", () => {
    expect(normalizeEmail("not an email")).toBeNull();
  });
});

describe("return path validation", () => {
  it("allows local application paths", () => {
    expect(sanitizeReturnPath("/admin/polls?state=open")).toBe(
      "/admin/polls?state=open",
    );
  });

  it("rejects external, protocol-relative, and auth-loop destinations", () => {
    expect(sanitizeReturnPath("https://evil.example")).toBe("/admin");
    expect(sanitizeReturnPath("//evil.example/path")).toBe("/admin");
    expect(sanitizeReturnPath("/auth/callback?code=secret")).toBe("/admin");
  });
});
