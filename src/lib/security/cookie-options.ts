import { getPublicEnvironment } from "@/lib/env";
import { unixSeconds } from "@/lib/security/token-shared";

export type RestaurantVoterCookieOptions = Readonly<{
  expires: Date;
  httpOnly: true;
  maxAge: number;
  path: "/";
  priority: "high";
  sameSite: "lax";
  secure: boolean;
}>;

export function shouldUseSecureCookies(
  appUrl = getPublicEnvironment().appUrl,
): boolean {
  return new URL(appUrl).protocol === "https:";
}

export function createSecureCookieOptions(
  expiresAt: number,
  now: Date = new Date(),
  appUrl = getPublicEnvironment().appUrl,
): RestaurantVoterCookieOptions {
  return {
    expires: new Date(expiresAt * 1_000),
    httpOnly: true,
    maxAge: Math.max(0, expiresAt - unixSeconds(now)),
    path: "/",
    priority: "high",
    sameSite: "lax",
    secure: shouldUseSecureCookies(appUrl),
  };
}
