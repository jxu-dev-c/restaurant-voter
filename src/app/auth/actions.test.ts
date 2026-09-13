import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { allowlistMaybeSingle, signInWithOtp } = vi.hoisted(() => ({
  allowlistMaybeSingle: vi.fn(),
  signInWithOtp: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: allowlistMaybeSingle }),
      }),
    }),
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => ({ auth: { signInWithOtp } }) }));
vi.mock("@/lib/env", () => ({ getPublicEnvironment: () => ({ appUrl: "https://lunch.example" }) }));
import { requestAdminMagicLink } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  allowlistMaybeSingle.mockResolvedValue({ data: { email: "allowed@example.com" }, error: null });
  signInWithOtp.mockResolvedValue({ error: null });
});

it.each(["first@example.com", "second@example.com"])("delegates organizer authorization to Supabase for %s", async (email) => {
  const form = new FormData();
  form.set("email", email);
  form.set("next", "/admin/polls/new");
  await expect(requestAdminMagicLink(form)).rejects.toThrow("redirect:/auth/check-email");
  expect(signInWithOtp).toHaveBeenCalledWith({ email, options: {
    shouldCreateUser: true,
    emailRedirectTo: "https://lunch.example/auth/callback?next=%2Fadmin%2Fpolls%2Fnew",
  } });
});

it("rejects malformed email before contacting auth", async () => {
  const form = new FormData(); form.set("email", "bad");
  await expect(requestAdminMagicLink(form)).rejects.toThrow("invalid-email");
  expect(signInWithOtp).not.toHaveBeenCalled();
});

it("does not request a sign-in email for an unlisted address", async () => {
  allowlistMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
  const form = new FormData();
  form.set("email", "blocked@example.com");
  await expect(requestAdminMagicLink(form)).rejects.toThrow("redirect:/auth/check-email");
  expect(signInWithOtp).not.toHaveBeenCalled();
});

it("fails closed without sending an email when the allowlist lookup fails", async () => {
  allowlistMaybeSingle.mockResolvedValueOnce({ data: null, error: new Error("database unavailable") });
  const form = new FormData();
  form.set("email", "allowed@example.com");
  await expect(requestAdminMagicLink(form)).rejects.toThrow("redirect:/auth/check-email");
  expect(signInWithOtp).not.toHaveBeenCalled();
});

it("does not reveal when Supabase rejects an unlisted email", async () => {
  signInWithOtp.mockResolvedValueOnce({ error: new Error("email not allowed") });
  const form = new FormData();
  form.set("email", "blocked@example.com");
  await expect(requestAdminMagicLink(form)).rejects.toThrow("redirect:/auth/check-email");
});
