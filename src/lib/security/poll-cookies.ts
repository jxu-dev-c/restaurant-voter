import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";

import {
  issuePollAccessGrant,
  type PollAccessGrantPayload,
  verifyPollAccessGrant,
} from "@/lib/security/access-grant";
import { createSecureCookieOptions } from "@/lib/security/cookie-options";
import {
  hashDeviceId,
  issueDeviceToken,
  type DeviceTokenPayload,
  verifyDeviceToken,
} from "@/lib/security/device";

const ACCESS_COOKIE_PREFIX = "rv_poll_access";
const DEVICE_COOKIE_PREFIX = "rv_poll_device";

function pollCookieSuffix(pollPublicId: string): string {
  return createHash("sha256")
    .update(pollPublicId, "utf8")
    .digest("hex")
    .slice(0, 16);
}

export function pollAccessCookieName(pollPublicId: string): string {
  return `${ACCESS_COOKIE_PREFIX}_${pollCookieSuffix(pollPublicId)}`;
}

export function pollDeviceCookieName(pollPublicId: string): string {
  return `${DEVICE_COOKIE_PREFIX}_${pollCookieSuffix(pollPublicId)}`;
}

export async function setPollAccessGrant(input: {
  accessVersion: number;
  pollPublicId: string;
}): Promise<PollAccessGrantPayload> {
  const now = new Date();
  const { payload, token } = issuePollAccessGrant(input, { now });
  const cookieStore = await cookies();
  cookieStore.set(
    pollAccessCookieName(input.pollPublicId),
    token,
    createSecureCookieOptions(payload.expiresAt, now),
  );

  return payload;
}

export async function readPollAccessGrant(input: {
  accessVersion: number;
  pollPublicId: string;
}): Promise<PollAccessGrantPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(pollAccessCookieName(input.pollPublicId))?.value;

  return token
    ? verifyPollAccessGrant(token, {
        expectedAccessVersion: input.accessVersion,
        expectedPollPublicId: input.pollPublicId,
      })
    : null;
}

export async function clearPollAccessGrant(
  pollPublicId: string,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(pollAccessCookieName(pollPublicId), "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: createSecureCookieOptions(0).secure,
  });
}

export type PollDeviceIdentity = Readonly<{
  created: boolean;
  deviceHash: string;
  payload: DeviceTokenPayload;
}>;

export async function readPollDeviceIdentity(
  pollPublicId: string,
): Promise<PollDeviceIdentity | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(pollDeviceCookieName(pollPublicId))?.value;
  if (!token) {
    return null;
  }

  const payload = verifyDeviceToken(token, {
    expectedPollPublicId: pollPublicId,
  });
  if (!payload) {
    return null;
  }

  return {
    created: false,
    deviceHash: hashDeviceId(payload),
    payload,
  };
}

export async function getOrCreatePollDeviceIdentity(
  pollPublicId: string,
): Promise<PollDeviceIdentity> {
  const current = await readPollDeviceIdentity(pollPublicId);
  if (current) {
    return current;
  }

  const now = new Date();
  const { payload, token } = issueDeviceToken(pollPublicId, { now });
  const cookieStore = await cookies();
  cookieStore.set(
    pollDeviceCookieName(pollPublicId),
    token,
    createSecureCookieOptions(payload.expiresAt, now),
  );

  return {
    created: true,
    deviceHash: hashDeviceId(payload),
    payload,
  };
}

export async function clearPollDeviceIdentity(
  pollPublicId: string,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(pollDeviceCookieName(pollPublicId), "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: createSecureCookieOptions(0).secure,
  });
}

