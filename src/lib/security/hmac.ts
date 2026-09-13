import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const MINIMUM_SECRET_BYTES = 32;
const MAX_SIGNED_TOKEN_LENGTH = 4_096;
const BASE64_URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const TOKEN_PREFIX_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;

function assertStrongSecret(secret: string): void {
  if (Buffer.byteLength(secret, "utf8") < MINIMUM_SECRET_BYTES) {
    throw new Error(
      `Signing secrets must be at least ${MINIMUM_SECRET_BYTES} bytes`,
    );
  }
}

function decodeBase64Url(value: string): Buffer | null {
  if (!BASE64_URL_PATTERN.test(value)) {
    return null;
  }

  const decoded = Buffer.from(value, "base64url");
  return decoded.toString("base64url") === value ? decoded : null;
}

export function constantTimeEqual(left: string, right: string): boolean {
  const leftDigest = createHash("sha256").update(left, "utf8").digest();
  const rightDigest = createHash("sha256").update(right, "utf8").digest();

  return timingSafeEqual(leftDigest, rightDigest);
}

export function hmacSha256Base64Url(
  value: string,
  secret: string,
): string {
  assertStrongSecret(secret);
  return createHmac("sha256", secret).update(value, "utf8").digest("base64url");
}

export function randomBase64Url(byteLength = 32): string {
  if (!Number.isSafeInteger(byteLength) || byteLength < 16) {
    throw new Error("Random token length must be an integer of at least 16 bytes");
  }

  return randomBytes(byteLength).toString("base64url");
}

export function signJsonToken(
  prefix: string,
  payload: unknown,
  secret: string,
): string {
  if (!TOKEN_PREFIX_PATTERN.test(prefix)) {
    throw new Error("Invalid signed-token prefix");
  }

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const unsignedToken = `${prefix}.${encodedPayload}`;
  const signature = hmacSha256Base64Url(unsignedToken, secret);

  return `${unsignedToken}.${signature}`;
}

export function verifyJsonToken(
  token: string,
  expectedPrefix: string,
  secret: string,
): unknown | null {
  assertStrongSecret(secret);

  if (
    token.length === 0 ||
    token.length > MAX_SIGNED_TOKEN_LENGTH ||
    !TOKEN_PREFIX_PATTERN.test(expectedPrefix)
  ) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== expectedPrefix) {
    return null;
  }

  const [, encodedPayload, encodedSignature] = parts;
  const candidateSignature = decodeBase64Url(encodedSignature);
  const expectedSignature = createHmac("sha256", secret)
    .update(`${expectedPrefix}.${encodedPayload}`, "utf8")
    .digest();
  const signatureHasExpectedLength =
    candidateSignature?.length === expectedSignature.length;
  const comparableSignature = signatureHasExpectedLength
    ? candidateSignature
    : Buffer.alloc(expectedSignature.length);
  const signatureIsValid = timingSafeEqual(
    expectedSignature,
    comparableSignature,
  );

  if (!signatureHasExpectedLength || !signatureIsValid) {
    return null;
  }

  const payloadBytes = decodeBase64Url(encodedPayload);
  if (!payloadBytes) {
    return null;
  }

  try {
    return JSON.parse(payloadBytes.toString("utf8")) as unknown;
  } catch {
    return null;
  }
}

