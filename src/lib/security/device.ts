import { z } from "zod";

import { getServerEnvironment } from "@/lib/env";
import {
  hmacSha256Base64Url,
  randomBase64Url,
  signJsonToken,
  verifyJsonToken,
} from "@/lib/security/hmac";
import {
  assertValidTtl,
  isCurrentlyValid,
  pollPublicIdSchema,
  unixSeconds,
} from "@/lib/security/token-shared";

const DEVICE_TOKEN_PREFIX = "rv-device-v1";
export const DEVICE_TOKEN_TTL_SECONDS = 400 * 24 * 60 * 60;

const deviceTokenPayloadSchema = z
  .object({
    kind: z.literal("poll-device"),
    pollPublicId: pollPublicIdSchema,
    deviceId: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    issuedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
  })
  .strict();

export type DeviceTokenPayload = Readonly<
  z.infer<typeof deviceTokenPayloadSchema>
>;

type IssueDeviceTokenOptions = {
  deviceId?: string;
  now?: Date;
  secret?: string;
  ttlSeconds?: number;
};

type VerifyDeviceTokenOptions = {
  expectedPollPublicId?: string;
  now?: Date;
  secret?: string;
};

type HashDeviceOptions = {
  secret?: string;
};

type HashDeviceTokenOptions = Omit<VerifyDeviceTokenOptions, "secret"> & {
  cookieSigningSecret?: string;
  deviceHashSecret?: string;
};

export function issueDeviceToken(
  pollPublicId: string,
  options: IssueDeviceTokenOptions = {},
): { payload: DeviceTokenPayload; token: string } {
  const ttlSeconds = options.ttlSeconds ?? DEVICE_TOKEN_TTL_SECONDS;
  assertValidTtl(ttlSeconds);
  const issuedAt = unixSeconds(options.now);
  const payload = deviceTokenPayloadSchema.parse({
    kind: "poll-device",
    pollPublicId,
    deviceId: options.deviceId ?? randomBase64Url(32),
    issuedAt,
    expiresAt: issuedAt + ttlSeconds,
  });
  const token = signJsonToken(
    DEVICE_TOKEN_PREFIX,
    payload,
    options.secret ?? getServerEnvironment().cookieSigningSecret,
  );

  return { payload: Object.freeze(payload), token };
}

export function createDeviceToken(
  pollPublicId: string,
  options: IssueDeviceTokenOptions = {},
): string {
  return issueDeviceToken(pollPublicId, options).token;
}

export function verifyDeviceToken(
  token: string,
  options: VerifyDeviceTokenOptions = {},
): DeviceTokenPayload | null {
  const decoded = verifyJsonToken(
    token,
    DEVICE_TOKEN_PREFIX,
    options.secret ?? getServerEnvironment().cookieSigningSecret,
  );
  const result = deviceTokenPayloadSchema.safeParse(decoded);

  if (!result.success) {
    return null;
  }

  const payload = result.data;
  if (!isCurrentlyValid(payload.issuedAt, payload.expiresAt, options.now)) {
    return null;
  }
  if (
    options.expectedPollPublicId !== undefined &&
    payload.pollPublicId !== options.expectedPollPublicId
  ) {
    return null;
  }

  return Object.freeze(payload);
}

export function hashDeviceId(
  input: Pick<DeviceTokenPayload, "pollPublicId" | "deviceId">,
  options: HashDeviceOptions = {},
): string {
  const payload = deviceTokenPayloadSchema
    .pick({
      pollPublicId: true,
      deviceId: true,
    })
    .parse({
      pollPublicId: input.pollPublicId,
      deviceId: input.deviceId,
    });

  return hmacSha256Base64Url(
    `restaurant-voter:device-hash:v1:${payload.pollPublicId}:${payload.deviceId}`,
    options.secret ?? getServerEnvironment().deviceHashSecret,
  );
}

export function hashDeviceToken(
  token: string,
  options: HashDeviceTokenOptions = {},
): string | null {
  const payload = verifyDeviceToken(token, {
    expectedPollPublicId: options.expectedPollPublicId,
    now: options.now,
    secret:
      options.cookieSigningSecret ??
      getServerEnvironment().cookieSigningSecret,
  });
  return payload
    ? hashDeviceId(payload, {
        secret:
          options.deviceHashSecret ?? getServerEnvironment().deviceHashSecret,
      })
    : null;
}
