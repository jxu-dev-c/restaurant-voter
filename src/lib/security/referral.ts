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

const REFERRAL_TOKEN_PREFIX = "rv-referral-v1";
export const DEFAULT_REFERRAL_TTL_SECONDS = 30 * 24 * 60 * 60;

const referralPayloadSchema = z
  .object({
    pollPublicId: pollPublicIdSchema,
    accessVersion: accessVersionSchema,
    issuedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
  })
  .strict();

export type ReferralTokenPayload = Readonly<
  z.infer<typeof referralPayloadSchema>
>;

type CreateReferralTokenOptions = {
  now?: Date;
  secret?: string;
  ttlSeconds?: number;
};

type VerifyReferralTokenOptions = {
  expectedAccessVersion?: number;
  expectedPollPublicId?: string;
  now?: Date;
  secret?: string;
};

export function createReferralToken(
  input: Pick<ReferralTokenPayload, "pollPublicId" | "accessVersion">,
  options: CreateReferralTokenOptions = {},
): string {
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_REFERRAL_TTL_SECONDS;
  assertValidTtl(ttlSeconds);
  const issuedAt = unixSeconds(options.now);
  const payload = referralPayloadSchema.parse({
    ...input,
    issuedAt,
    expiresAt: issuedAt + ttlSeconds,
  });

  return signJsonToken(
    REFERRAL_TOKEN_PREFIX,
    payload,
    options.secret ?? getServerEnvironment().referralSigningSecret,
  );
}

export function verifyReferralToken(
  token: string,
  options: VerifyReferralTokenOptions = {},
): ReferralTokenPayload | null {
  const decoded = verifyJsonToken(
    token,
    REFERRAL_TOKEN_PREFIX,
    options.secret ?? getServerEnvironment().referralSigningSecret,
  );
  const result = referralPayloadSchema.safeParse(decoded);

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

