import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
const { getUser, verifyOtp, signOut, exchangeCodeForSession } = vi.hoisted(() => ({
  getUser: vi.fn(), verifyOtp: vi.fn(), signOut: vi.fn(), exchangeCodeForSession: vi.fn(),
}));
vi.mock("@/lib/env", () => ({ getPublicEnvironment: () => ({ appUrl: "https://lunch.example" }) }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => ({ auth: { getUser, verifyOtp, signOut, exchangeCodeForSession } }) }));
import { GET, POST } from "./route";

function confirmRequest(parameters = "token_hash=test&type=email") {
  return new NextRequest("https://lunch.example/auth/callback", {
    method: "POST",
    headers: { origin: "https://lunch.example", "content-type": "application/x-www-form-urlencoded" },
    body: parameters,
  });
}

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
  const response = await POST(confirmRequest("token_hash=test&type=signup&next=%2Fadmin%2Fpolls%2Fnew"));
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("https://lunch.example/admin/polls/new");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it("rejects unverified sessions and clears them", async () => {
  verifyOtp.mockResolvedValue({ data: { user: { id: "organizer", email: "new@example.com" } }, error: null });
  const response = await POST(confirmRequest("token_hash=test&type=magiclink"));
  expect(signOut).toHaveBeenCalledOnce();
  expect(response.headers.get("location")).toBe("https://lunch.example/auth/login?error=unauthorized");
});

it("rejects expired links without granting access", async () => {
  verifyOtp.mockResolvedValue({ data: { user: null }, error: new Error("Expired") });
  const response = await POST(confirmRequest());
  expect(response.headers.get("location")).toBe("https://lunch.example/auth/login?error=invalid-link");
  expect(getUser).not.toHaveBeenCalled();
});

it("does not consume a token when an email scanner follows the link", async () => {
  const request = new NextRequest("https://lunch.example/auth/callback?token_hash=test&type=email");
  for (let visit = 0; visit < 2; visit++) {
    const response = await GET(request);
    expect(response.headers.get("location")).toBe("https://lunch.example/auth/confirm?token_hash=test&type=email");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  }
  expect(verifyOtp).not.toHaveBeenCalled();
  expect(exchangeCodeForSession).not.toHaveBeenCalled();
  const response = await POST(confirmRequest());
  expect(verifyOtp).toHaveBeenCalledExactlyOnceWith({ token_hash: "test", type: "email" });
  expect(response.headers.get("location")).toBe("https://lunch.example/admin");
});

it("blocks cross-origin form submissions before token redemption", async () => {
  const request = confirmRequest();
  request.headers.set("origin", "https://other.example");
  expect((await POST(request)).status).toBe(403);
  expect(verifyOtp).not.toHaveBeenCalled();
});

it("rejects unsupported token types and external return destinations", async () => {
  const invalid = await POST(confirmRequest("token_hash=test&type=recovery"));
  expect(invalid.headers.get("location")).toContain("error=invalid-link");
  expect(verifyOtp).not.toHaveBeenCalled();
  const valid = await POST(confirmRequest("token_hash=test&type=email&next=https://other.example"));
  expect(valid.headers.get("location")).toBe("https://lunch.example/admin");
});

it("uses the PKCE exchange's verified identity before reading the new session cookie", async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: new Error("Session not available yet") });
  const response = await GET(new NextRequest("https://lunch.example/auth/callback?code=one-time-code"));
  expect(exchangeCodeForSession).toHaveBeenCalledWith("one-time-code");
  expect(response.headers.get("location")).toBe("https://lunch.example/admin");
  expect(getUser).not.toHaveBeenCalled();
  expect(signOut).not.toHaveBeenCalled();
});
