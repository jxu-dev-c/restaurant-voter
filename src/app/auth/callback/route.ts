import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/auth/admin-email";
import { sanitizeReturnPath } from "@/lib/auth/return-path";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const acceptedOtpTypes = new Set<EmailOtpType>([
  "email",
  "magiclink",
  "signup",
]);

function loginErrorResponse(request: NextRequest, error: string) {
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("error", error);
  const response = NextResponse.redirect(loginUrl, 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const rawType = url.searchParams.get("type") as EmailOtpType | null;
  const returnTo = sanitizeReturnPath(url.searchParams.get("next"), "/admin");
  const supabase = await createServerSupabaseClient();

  let authError: Error | null = null;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error;
  } else if (tokenHash && rawType && acceptedOtpTypes.has(rawType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: rawType,
    });
    authError = error;
  } else {
    return loginErrorResponse(request, "invalid-link");
  }

  if (authError) {
    return loginErrorResponse(request, "invalid-link");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !isAdminEmail(user.email)) {
    await supabase.auth.signOut();
    return loginErrorResponse(request, "unauthorized");
  }

  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

