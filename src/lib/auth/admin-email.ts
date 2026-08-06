import { z } from "zod";

import { getServerEnvironment } from "@/lib/env";
import { constantTimeEqual } from "@/lib/security/hmac";

const emailSchema = z.string().trim().toLowerCase().email();

export function normalizeEmail(value: string): string | null {
  const result = emailSchema.safeParse(value.normalize("NFKC"));
  return result.success ? result.data : null;
}

export function isAdminEmail(
  candidate: string | null | undefined,
  expectedAdminEmail = getServerEnvironment().adminEmail,
): boolean {
  const normalizedCandidate = candidate ? normalizeEmail(candidate) : null;
  const normalizedExpected = normalizeEmail(expectedAdminEmail);

  if (!normalizedCandidate || !normalizedExpected) {
    return false;
  }

  return constantTimeEqual(normalizedCandidate, normalizedExpected);
}

