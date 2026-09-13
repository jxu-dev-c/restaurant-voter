import "server-only";

import { isAuthError, isAuthSessionMissingError, type User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";

import { sanitizeReturnPath } from "@/lib/auth/return-path";
import { logServerError } from "@/lib/observability/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const invalidSessionCodes = new Set([
  "bad_jwt",
  "invalid_jwt",
  "no_authorization",
  "invalid_credentials",
  "session_not_found",
  "session_expired",
  "refresh_token_not_found",
  "refresh_token_already_used",
  "user_not_found",
  "user_banned",
  "email_not_confirmed",
]);

export class AdminAuthorizationError extends Error {
  readonly status = 401;

  constructor() {
    super("Organizer authentication is required");
    this.name = "AdminAuthorizationError";
  }
}

/**
 * Deduped per request: the admin layout and the page beneath it both resolve
 * the organizer, and this is a network round trip to Supabase Auth. Caching
 * also means a failed lookup is not retried twice within one render.
 */
export const getAdminUser = cache(async (): Promise<User | null> => {
  const supabase = await createServerSupabaseClient();
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user || !user.email || !user.email_confirmed_at || user.is_anonymous) {
      return null;
    }

    return user;
  } catch (error) {
    if (
      isAuthSessionMissingError(error) ||
      (isAuthError(error) && invalidSessionCodes.has(error.code ?? ""))
    ) {
      return null;
    }

    // A failed lookup is not evidence that the session ended. Keep access
    // blocked, but let the error boundary retry instead of requesting a login.
    const failure = new Error("Unable to verify your sign-in. Please try again.");
    logServerError("auth.user_lookup.failed", failure, {
      authErrorName: error instanceof Error ? error.name : "UnknownError",
      authErrorCode: isAuthError(error) ? error.code ?? null : null,
      authStatus: isAuthError(error) ? error.status ?? null : null,
    });
    throw failure;
  }
});

export async function assertAdmin(): Promise<User> {
  const user = await getAdminUser();
  if (!user) {
    throw new AdminAuthorizationError();
  }

  return user;
}

export async function requireAdmin(
  options: { returnTo?: string } = {},
): Promise<User> {
  const user = await getAdminUser();
  if (user) {
    return user;
  }

  const returnTo = sanitizeReturnPath(options.returnTo, "/admin");
  redirect(`/auth/login?next=${encodeURIComponent(returnTo)}`);
}
