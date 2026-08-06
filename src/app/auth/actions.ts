"use server";

import { redirect } from "next/navigation";

import { isAdminEmail, normalizeEmail } from "@/lib/auth/admin-email";
import { sanitizeReturnPath } from "@/lib/auth/return-path";
import { getPublicEnvironment } from "@/lib/env";
import { logServerError } from "@/lib/observability/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requestAdminMagicLink(formData: FormData): Promise<void> {
  const submittedEmail = String(formData.get("email") ?? "");
  const email = normalizeEmail(submittedEmail);
  const returnTo = sanitizeReturnPath(
    String(formData.get("next") ?? ""),
    "/admin",
  );

  if (!email) {
    redirect(
      `/auth/login?error=invalid-email&next=${encodeURIComponent(returnTo)}`,
    );
  }

  // Return the same success screen for non-admin addresses. This prevents the
  // login form from becoming an oracle for the configured administrator email.
  if (!isAdminEmail(email)) {
    redirect("/auth/check-email");
  }

  const environment = getPublicEnvironment();
  const callbackUrl = new URL("/auth/callback", environment.appUrl);
  callbackUrl.searchParams.set("next", returnTo);
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      shouldCreateUser: true,
    },
  });

  if (error) {
    logServerError("auth.magic_link.send_failed", error, { returnTo });
    redirect(
      `/auth/login?error=send-failed&next=${encodeURIComponent(returnTo)}`,
    );
  }

  redirect("/auth/check-email");
}

export async function signOutAdmin(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) logServerError("auth.sign_out.failed", error);
  redirect("/auth/login");
}
