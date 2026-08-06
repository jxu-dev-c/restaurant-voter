import { describe, expect, it } from "vitest";

import {
  displayNameSchema,
  escapeDisplayName,
  MAX_DISPLAY_NAME_LENGTH,
  parseDisplayName,
} from "@/lib/security/display-name";

describe("display names", () => {
  it("normalizes Unicode and whitespace", () => {
    expect(parseDisplayName("  Ｊａｓｏｎ\n\tXu  ")).toBe("Jason Xu");
  });

  it("rejects empty, overlong, control, and bidi-override names", () => {
    expect(displayNameSchema.safeParse("   ").success).toBe(false);
    expect(
      displayNameSchema.safeParse("a".repeat(MAX_DISPLAY_NAME_LENGTH + 1))
        .success,
    ).toBe(false);
    expect(displayNameSchema.safeParse("Jane\u0000Doe").success).toBe(false);
    expect(displayNameSchema.safeParse("Jane\u202EDoe").success).toBe(false);
  });

  it("provides HTML escaping for non-React output", () => {
    expect(escapeDisplayName(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });
});

