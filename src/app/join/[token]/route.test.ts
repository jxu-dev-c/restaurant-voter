import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { getPollAccessRecord, setPollAccessGrant, verifyReferralToken } = vi.hoisted(() => ({
  getPollAccessRecord: vi.fn(), setPollAccessGrant: vi.fn(), verifyReferralToken: vi.fn(),
}));
vi.mock("@/lib/data/polls", () => ({ getPollAccessRecord }));
vi.mock("@/lib/security/poll-cookies", () => ({ setPollAccessGrant }));
vi.mock("@/lib/security/referral", () => ({ verifyReferralToken }));
vi.mock("@/lib/env", () => ({ getPublicEnvironment: () => ({ appUrl: "http://127.0.0.1:3110" }) }));
import { GET } from "./route";
const request = new Request("http://localhost:3110/join/test-token");
const context = { params: Promise.resolve({ token: "test-token" }) };
beforeEach(() => {
  vi.clearAllMocks();
  verifyReferralToken.mockReturnValue({ pollPublicId: "trial-poll-public", accessVersion: 1 });
  getPollAccessRecord.mockResolvedValue({ publicId: "trial-poll-public", status: "voting", accessVersion: 1 });
});
it("keeps referral exchange on the configured cookie origin", async () => {
  const response = await GET(request, context);
  expect(response.headers.get("location")).toBe("http://127.0.0.1:3110/poll/trial-poll-public");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(setPollAccessGrant).toHaveBeenCalledWith({ pollPublicId: "trial-poll-public", accessVersion: 1 });
});
it("rejects stale or invalid links without granting access", async () => {
  verifyReferralToken.mockReturnValue(null);
  expect((await GET(request, context)).headers.get("location")).toBe("http://127.0.0.1:3110/link-unavailable");
  expect(setPollAccessGrant).not.toHaveBeenCalled();
});
