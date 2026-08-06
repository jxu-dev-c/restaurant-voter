import { describe, expect, it } from "vitest";

import { isAdminEmail, normalizeEmail } from "@/lib/auth/admin-email";
import { sanitizeReturnPath } from "@/lib/auth/return-path";

describe("admin email checks", () => {
  it("normalizes and compares the configured address", () => {
    expect(normalizeEmail("  ADMIN@Example.COM ")).toBe("admin@example.com");
    expect(isAdminEmail("ADMIN@example.com", "admin@example.com")).toBe(true);
    expect(isAdminEmail("other@example.com", "admin@example.com")).toBe(false);
  });

  it("rejects malformed email values", () => {
    expect(normalizeEmail("not an email")).toBeNull();
    expect(isAdminEmail(undefined, "admin@example.com")).toBe(false);
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
