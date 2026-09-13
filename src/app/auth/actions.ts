"use server";

import { redirect } from "next/navigation";

import { normalizeEmail } from "@/lib/auth/admin-email";
import { sanitizeReturnPath } from "@/lib/auth/return-path";
import { getPublicEnvironment } from "@/lib/env";
import { logServerError } from "@/lib/observability/logger";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
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

  const { data: allowlistEntry, error: allowlistError } =
    await createServiceRoleClient()
      .from("organizer_email_allowlist")
      .select("email")
      .eq("email", email)
      .maybeSingle();

  if (allowlistError) {
    logServerError("auth.allowlist.lookup_failed", allowlistError, { returnTo });
  }
  if (allowlistError || !allowlistEntry) {
    // Give every valid email the same response without asking Supabase Auth to
    // send a link to an unlisted address.
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
    // Do not reveal whether an address is absent from the Supabase allowlist.
    redirect("/auth/check-email");
  }

  redirect("/auth/check-email");
}

export async function signOutAdmin(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) logServerError("auth.sign_out.failed", error);
  redirect("/auth/login");
}
