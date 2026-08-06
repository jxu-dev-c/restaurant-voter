import { describe, expect, it } from "vitest";

import {
  createReferralToken,
  verifyReferralToken,
} from "@/lib/security/referral";

const secret = "referral-secret-that-is-at-least-32-bytes-long";
const now = new Date("2026-08-05T12:00:00.000Z");

describe("referral tokens", () => {
  it("round-trips a valid versioned token", () => {
    const token = createReferralToken(
      { accessVersion: 3, pollPublicId: "poll_abc-123" },
      { now, secret, ttlSeconds: 60 },
    );

    expect(token.startsWith("rv-referral-v1.")).toBe(true);
    expect(
      verifyReferralToken(token, {
        expectedAccessVersion: 3,
        expectedPollPublicId: "poll_abc-123",
        now: new Date(now.getTime() + 30_000),
        secret,
      }),
    ).toMatchObject({
      accessVersion: 3,
      pollPublicId: "poll_abc-123",
    });
  });

  it("rejects tampering, expiration, and rotated access versions", () => {
    const token = createReferralToken(
      { accessVersion: 3, pollPublicId: "poll_abc-123" },
      { now, secret, ttlSeconds: 60 },
    );
    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

    expect(verifyReferralToken(tampered, { now, secret })).toBeNull();
    expect(
      verifyReferralToken(token, {
        expectedAccessVersion: 4,
        now,
        secret,
      }),
    ).toBeNull();
    expect(
      verifyReferralToken(token, {
        now: new Date(now.getTime() + 60_000),
        secret,
      }),
    ).toBeNull();
  });

  it("rejects malformed input without throwing", () => {
    expect(verifyReferralToken("not-a-token", { now, secret })).toBeNull();
    expect(
      verifyReferralToken("rv-referral-v2.bad.bad", { now, secret }),
    ).toBeNull();
  });
});

