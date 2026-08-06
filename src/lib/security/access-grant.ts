import { z } from "zod";

import { getServerEnvironment } from "@/lib/env";
import { signJsonToken, verifyJsonToken } from "@/lib/security/hmac";
import {
  accessVersionSchema,
  assertValidTtl,
  isCurrentlyValid,
  pollPublicIdSchema,
  unixSeconds,
} from "@/lib/security/token-shared";

const ACCESS_GRANT_PREFIX = "rv-access-v1";
export const POLL_ACCESS_GRANT_TTL_SECONDS = 30 * 24 * 60 * 60;

const accessGrantPayloadSchema = z
  .object({
    kind: z.literal("poll-access"),
    pollPublicId: pollPublicIdSchema,
    accessVersion: accessVersionSchema,
    issuedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
  })
  .strict();

export type PollAccessGrantPayload = Readonly<
  z.infer<typeof accessGrantPayloadSchema>
>;

type IssuePollAccessGrantOptions = {
  now?: Date;
  secret?: string;
  ttlSeconds?: number;
};

type VerifyPollAccessGrantOptions = {
  expectedAccessVersion?: number;
  expectedPollPublicId?: string;
  now?: Date;
  secret?: string;
};

export function issuePollAccessGrant(
  input: Pick<PollAccessGrantPayload, "pollPublicId" | "accessVersion">,
  options: IssuePollAccessGrantOptions = {},
): { payload: PollAccessGrantPayload; token: string } {
  const ttlSeconds = options.ttlSeconds ?? POLL_ACCESS_GRANT_TTL_SECONDS;
  assertValidTtl(ttlSeconds);
  const issuedAt = unixSeconds(options.now);
  const payload = accessGrantPayloadSchema.parse({
    kind: "poll-access",
    ...input,
    issuedAt,
    expiresAt: issuedAt + ttlSeconds,
  });
  const token = signJsonToken(
    ACCESS_GRANT_PREFIX,
    payload,
    options.secret ?? getServerEnvironment().cookieSigningSecret,
  );

  return { payload: Object.freeze(payload), token };
}

export function createPollAccessGrantToken(
  input: Pick<PollAccessGrantPayload, "pollPublicId" | "accessVersion">,
  options: IssuePollAccessGrantOptions = {},
): string {
  return issuePollAccessGrant(input, options).token;
}

export function verifyPollAccessGrant(
  token: string,
  options: VerifyPollAccessGrantOptions = {},
): PollAccessGrantPayload | null {
  const decoded = verifyJsonToken(
    token,
    ACCESS_GRANT_PREFIX,
    options.secret ?? getServerEnvironment().cookieSigningSecret,
  );
  const result = accessGrantPayloadSchema.safeParse(decoded);

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
  if (
    options.expectedAccessVersion !== undefined &&
    payload.accessVersion !== options.expectedAccessVersion
  ) {
    return null;
  }

  return Object.freeze(payload);
}

