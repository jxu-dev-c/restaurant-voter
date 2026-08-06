import { z } from "zod";

export const pollPublicIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Poll public IDs may contain only letters, numbers, underscores, and hyphens",
  );

export const accessVersionSchema = z.number().int().positive();

export function unixSeconds(date: Date = new Date()): number {
  return Math.floor(date.getTime() / 1_000);
}

export function isCurrentlyValid(
  issuedAt: number,
  expiresAt: number,
  now: Date = new Date(),
): boolean {
  const currentTime = unixSeconds(now);
  const maximumClockSkewSeconds = 5 * 60;

  return (
    issuedAt <= currentTime + maximumClockSkewSeconds &&
    expiresAt > currentTime &&
    expiresAt > issuedAt
  );
}

export function assertValidTtl(ttlSeconds: number): void {
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error("Token lifetime must be a positive integer number of seconds");
  }
}

