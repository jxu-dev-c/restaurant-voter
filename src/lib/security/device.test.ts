import { describe, expect, it } from "vitest";

import {
  createPollAccessGrantToken,
  verifyPollAccessGrant,
} from "@/lib/security/access-grant";
import {
  hashDeviceId,
  hashDeviceToken,
  issueDeviceToken,
  verifyDeviceToken,
} from "@/lib/security/device";

const cookieSecret = "cookie-secret-that-is-at-least-32-bytes-long";
const hashSecret = "device-hash-secret-that-is-at-least-32-bytes";
const now = new Date("2026-08-05T12:00:00.000Z");

describe("poll access grants", () => {
  it("binds a signed grant to both poll and access version", () => {
    const token = createPollAccessGrantToken(
      { accessVersion: 2, pollPublicId: "poll_123" },
      { now, secret: cookieSecret, ttlSeconds: 120 },
    );

    expect(
      verifyPollAccessGrant(token, {
        expectedAccessVersion: 2,
        expectedPollPublicId: "poll_123",
        now,
        secret: cookieSecret,
      }),
    ).not.toBeNull();
    expect(
      verifyPollAccessGrant(token, {
        expectedAccessVersion: 3,
        expectedPollPublicId: "poll_123",
        now,
        secret: cookieSecret,
      }),
    ).toBeNull();
  });
});

describe("device tokens", () => {
  it("creates a signed per-poll token and a database-safe HMAC hash", () => {
    const { payload, token } = issueDeviceToken("poll_123", {
      now,
      secret: cookieSecret,
      ttlSeconds: 120,
    });
    const verified = verifyDeviceToken(token, {
      expectedPollPublicId: "poll_123",
      now,
      secret: cookieSecret,
    });
    const deviceHash = hashDeviceId(payload, { secret: hashSecret });

    expect(verified).toEqual(payload);
    expect(deviceHash).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(
      hashDeviceToken(token, {
        cookieSigningSecret: cookieSecret,
        deviceHashSecret: hashSecret,
        expectedPollPublicId: "poll_123",
        now,
      }),
    ).toBe(deviceHash);
  });

  it("changes the database hash across polls and rejects tampering", () => {
    const deviceId = "a".repeat(43);
    const first = hashDeviceId(
      { deviceId, pollPublicId: "poll_one" },
      { secret: hashSecret },
    );
    const second = hashDeviceId(
      { deviceId, pollPublicId: "poll_two" },
      { secret: hashSecret },
    );
    const { token } = issueDeviceToken("poll_one", {
      deviceId,
      now,
      secret: cookieSecret,
    });
    const tampered = `${token.slice(0, -2)}aa`;

    expect(first).not.toBe(second);
    expect(verifyDeviceToken(tampered, { now, secret: cookieSecret })).toBeNull();
  });
});
