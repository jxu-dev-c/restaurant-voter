import type { EmailOtpType, User } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { getPublicEnvironment } from "@/lib/env";
import { sanitizeReturnPath } from "@/lib/auth/return-path";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const acceptedOtpTypes = new Set<EmailOtpType>([
  "email",
  "magiclink",
  "signup",
]);

function loginErrorResponse(error: string) {
  const loginUrl = new URL("/auth/login", getPublicEnvironment().appUrl);
  loginUrl.searchParams.set("error", error);
  const response = NextResponse.redirect(loginUrl, 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  // Email scanners follow GET links. Never redeem an emailed token until the
  // organizer submits the confirmation form.
  if (url.searchParams.has("token_hash")) {
    const confirmUrl = new URL("/auth/confirm", getPublicEnvironment().appUrl);
    confirmUrl.search = url.search;
    const response = NextResponse.redirect(confirmUrl, 303);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  return redeemCredential(url.searchParams);
}

export async function POST(request: NextRequest) {
  const appOrigin = new URL(getPublicEnvironment().appUrl).origin;
  if (request.headers.get("origin") !== appOrigin) {
    return new NextResponse(null, { status: 403 });
  }
  const form = await request.formData();
  const parameters = new URLSearchParams();
  for (const key of ["token_hash", "type", "next"]) {
    const value = form.get(key);
    if (typeof value === "string") parameters.set(key, value);
  }
  return redeemCredential(parameters);
}

async function redeemCredential(parameters: URLSearchParams) {
  const code = parameters.get("code");
  const tokenHash = parameters.get("token_hash");
  const rawType = parameters.get("type") as EmailOtpType | null;
  const returnTo = sanitizeReturnPath(parameters.get("next"), "/admin");
  const supabase = await createServerSupabaseClient();

  let authError: Error | null = null;
  let user: User | null = null;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    user = data.user;
    authError = error;
  } else if (tokenHash && rawType && acceptedOtpTypes.has(rawType)) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: rawType,
    });
    user = data.user;
    authError = error;
  } else {
    return loginErrorResponse("invalid-link");
  }

  if (authError) {
    return loginErrorResponse("invalid-link");
  }

  // Both exchange methods verify the one-time credential with Supabase and
  // return the authenticated user. Use that result before the newly written
  // cookie is read on the redirected request.
  if (!user || !user.email || !user.email_confirmed_at || user.is_anonymous) {
    await supabase.auth.signOut();
    return loginErrorResponse("unauthorized");
  }

  const response = NextResponse.redirect(new URL(returnTo, getPublicEnvironment().appUrl), 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
