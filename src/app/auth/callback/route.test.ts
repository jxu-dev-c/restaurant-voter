import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
const { getUser, verifyOtp, signOut, exchangeCodeForSession } = vi.hoisted(() => ({
  getUser: vi.fn(), verifyOtp: vi.fn(), signOut: vi.fn(), exchangeCodeForSession: vi.fn(),
}));
vi.mock("@/lib/env", () => ({ getPublicEnvironment: () => ({ appUrl: "https://lunch.example" }) }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => ({ auth: { getUser, verifyOtp, signOut, exchangeCodeForSession } }) }));
import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  signOut.mockResolvedValue({ error: null });
  const result = { data: { user: {
    id: "organizer", email: "new@example.com", email_confirmed_at: "2026-09-11", is_anonymous: false,
  } }, error: null };
  verifyOtp.mockResolvedValue(result);
  exchangeCodeForSession.mockResolvedValue(result);
});

it("keeps authenticated redirects on the configured origin", async () => {
  const response = await GET(new NextRequest("http://upstream.internal/auth/callback?token_hash=test&type=signup&next=%2Fadmin%2Fpolls%2Fnew"));
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("https://lunch.example/admin/polls/new");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it("rejects unverified sessions and clears them", async () => {
  verifyOtp.mockResolvedValue({ data: { user: { id: "organizer", email: "new@example.com" } }, error: null });
  const response = await GET(new NextRequest("http://upstream.internal/auth/callback?token_hash=test&type=magiclink"));
  expect(signOut).toHaveBeenCalledOnce();
  expect(response.headers.get("location")).toBe("https://lunch.example/auth/login?error=unauthorized");
});

it("rejects expired links without granting access", async () => {
  verifyOtp.mockResolvedValue({ data: { user: null }, error: new Error("Expired") });
  const response = await GET(new NextRequest("http://upstream.internal/auth/callback?token_hash=test&type=email"));
  expect(response.headers.get("location")).toBe("https://lunch.example/auth/login?error=invalid-link");
  expect(getUser).not.toHaveBeenCalled();
});

it("uses the PKCE exchange's verified identity before reading the new session cookie", async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: new Error("Session not available yet") });
  const response = await GET(new NextRequest("https://lunch.example/auth/callback?code=one-time-code"));
  expect(exchangeCodeForSession).toHaveBeenCalledWith("one-time-code");
  expect(response.headers.get("location")).toBe("https://lunch.example/admin");
  expect(getUser).not.toHaveBeenCalled();
  expect(signOut).not.toHaveBeenCalled();
});
