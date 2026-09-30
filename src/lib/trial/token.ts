import { z } from "zod";

import { getServerEnvironment } from "@/lib/env";
import { signJsonToken, verifyJsonToken } from "@/lib/security/hmac";
import { isCurrentlyValid, unixSeconds } from "@/lib/security/token-shared";

const PREFIX = "rv-trial-v1";
const schema = z.object({
  kind: z.literal("trial-organizer"),
  generation: z.uuid(),
  issuedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().positive(),
}).strict();

type Options = { now?: Date; secret?: string };

export function issueTrialSession(
  input: { generation: string; resetsAt: string },
  options: Options = {},
) {
  const payload = schema.parse({
    kind: "trial-organizer",
    generation: input.generation,
    issuedAt: unixSeconds(options.now),
    expiresAt: unixSeconds(new Date(input.resetsAt)),
  });
  if (!isCurrentlyValid(payload.issuedAt, payload.expiresAt, options.now)) {
    throw new Error("The trial workspace needs to be refreshed");
  }
  return {
    payload,
    token: signJsonToken(PREFIX, payload, options.secret ?? getServerEnvironment().cookieSigningSecret),
  };
}

export function verifyTrialSession(token: string, options: Options = {}) {
  const result = schema.safeParse(verifyJsonToken(
    token, PREFIX, options.secret ?? getServerEnvironment().cookieSigningSecret,
  ));
  if (!result.success || !isCurrentlyValid(result.data.issuedAt, result.data.expiresAt, options.now)) {
    return null;
  }
  return result.data;
}
