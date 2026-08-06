import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { isAdminEmail } from "@/lib/auth/admin-email";
import { sanitizeReturnPath } from "@/lib/auth/return-path";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export class AdminAuthorizationError extends Error {
  readonly status = 401;

  constructor() {
    super("Administrator authentication is required");
    this.name = "AdminAuthorizationError";
  }
}

export async function getAdminUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !isAdminEmail(user.email)) {
    return null;
  }

  return user;
}

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

