import { AuthApiError, AuthInvalidJwtError, AuthRetryableFetchError, AuthSessionMissingError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getUser, logServerError } = vi.hoisted(() => ({ getUser: vi.fn(), logServerError: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => ({ auth: { getUser } }) }));
vi.mock("@/lib/observability/logger", () => ({ logServerError }));
vi.mock("next/navigation", () => ({ redirect: vi.fn((url: string) => { throw new Error(`redirect:${url}`); }) }));
import { assertAdmin, getAdminUser, requireAdmin } from "./admin";

beforeEach(() => vi.clearAllMocks());

it.each(["first@example.com", "second@example.com"])("accepts a verified organizer %s", async (email) => {
  const user = { id: email, email, email_confirmed_at: "2026-09-11", is_anonymous: false };
  getUser.mockResolvedValue({ data: { user }, error: null });
  await expect(assertAdmin()).resolves.toEqual(user);
});

it.each([
  null,
  { id: "unverified", email: "a@example.com" },
  { id: "anonymous", email: "a@example.com", email_confirmed_at: "2026-09-11", is_anonymous: true },
])("rejects missing, unverified, and anonymous identities", async (user) => {
  getUser.mockResolvedValue({ data: { user }, error: null });
  await expect(getAdminUser()).resolves.toBeNull();
  await expect(assertAdmin()).rejects.toThrow("Organizer authentication is required");
  await expect(requireAdmin()).rejects.toThrow("redirect:/auth/login?next=%2Fadmin");
});

it.each([
  new AuthSessionMissingError(),
  new AuthInvalidJwtError("Invalid token"),
  ...[
    "bad_jwt", "no_authorization", "invalid_credentials", "session_not_found",
    "session_expired", "refresh_token_not_found", "refresh_token_already_used",
    "user_not_found", "user_banned", "email_not_confirmed",
  ].map((code) => new AuthApiError("Sign-in required", 400, code)),
])("still requests sign-in for an invalid session: %s", async (error) => {
  getUser.mockResolvedValue({ data: { user: null }, error });

  await expect(requireAdmin({ returnTo: "/admin/centers" })).rejects.toThrow(
    "redirect:/auth/login?next=%2Fadmin%2Fcenters",
  );
  await expect(assertAdmin()).rejects.toThrow("Organizer authentication is required");
  expect(logServerError).not.toHaveBeenCalled();
});

it.each([
  new AuthRetryableFetchError("Fetch failed", 0),
  new AuthRetryableFetchError("Gateway Timeout", 504),
  new AuthApiError("Too many requests", 429, "over_request_rate_limit"),
  new AuthApiError("Request timed out", 408, "request_timeout"),
  new AuthApiError("Hook timed out", 500, "hook_timeout"),
  new AuthApiError("Unexpected service error", 503, "unexpected_failure"),
  new AuthApiError("Unknown upstream failure", 400, undefined),
  new AuthApiError("Feature unavailable", 403, undefined),
])("blocks access without redirecting on an account-check failure: %s", async (error) => {
  getUser.mockResolvedValue({ data: { user: null }, error });

  await expect(requireAdmin()).rejects.toThrow("Unable to verify your sign-in");
  await expect(assertAdmin()).rejects.toThrow("Unable to verify your sign-in");
  expect(redirect).not.toHaveBeenCalled();
  expect(logServerError).toHaveBeenCalledWith(
    "auth.user_lookup.failed",
    expect.any(Error),
    { authErrorName: error.name, authErrorCode: error.code ?? null, authStatus: error.status },
  );
});

it("recovers on the next check without requesting another sign-in", async () => {
  const user = { id: "organizer", email: "a@example.com", email_confirmed_at: "2026-09-11" };
  getUser
    .mockRejectedValueOnce(new TypeError("fetch failed: private upstream details"))
    .mockResolvedValueOnce({ data: { user }, error: null });

  await expect(requireAdmin()).rejects.toThrow("Unable to verify your sign-in");
  await expect(requireAdmin()).resolves.toEqual(user);
  expect(redirect).not.toHaveBeenCalled();
  expect(logServerError).toHaveBeenCalledWith(
    "auth.user_lookup.failed",
    expect.objectContaining({ message: "Unable to verify your sign-in. Please try again." }),
    { authErrorName: "TypeError", authErrorCode: null, authStatus: null },
  );
});

it("does not authorize a returned identity when its verification also failed", async () => {
  getUser.mockResolvedValue({
    data: { user: { id: "organizer", email: "a@example.com", email_confirmed_at: "2026-09-11" } },
    error: new AuthRetryableFetchError("Service unavailable", 503),
  });

  await expect(assertAdmin()).rejects.toThrow("Unable to verify your sign-in");
  expect(redirect).not.toHaveBeenCalled();
});
