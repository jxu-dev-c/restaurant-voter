import { describe, expect, it } from "vitest";
import { signJsonToken } from "@/lib/security/hmac";
import { issueTrialSession, verifyTrialSession } from "./token";

const secret = "trial-test-secret-at-least-32-characters";
const generation = "00000000-0000-4000-8000-000000000011";
const now = new Date("2026-09-29T12:00:00Z");
const resetsAt = "2026-10-05T00:00:00Z";

describe("trial organizer session", () => {
  it("expires at the weekly reset and carries no selectable team identity", () => {
    const { token, payload } = issueTrialSession({ generation, resetsAt }, { now, secret });
    expect(verifyTrialSession(token, { now, secret })).toEqual(payload);
    expect(payload).not.toHaveProperty("teamId");
    expect(verifyTrialSession(token, { now: new Date(resetsAt), secret })).toBeNull();
  });
  it("rejects tampering and other token purposes", () => {
    const { token } = issueTrialSession({ generation, resetsAt }, { now, secret });
    expect(verifyTrialSession(token + "a", { now, secret })).toBeNull();
    expect(verifyTrialSession(signJsonToken("rv-access-v1", { generation }, secret), { now, secret })).toBeNull();
  });
  it("rejects a signed payload that tries to select a production team", () => {
    const { payload } = issueTrialSession({ generation, resetsAt }, { now, secret });
    const token = signJsonToken("rv-trial-v1", { ...payload, teamId: "production" }, secret);
    expect(verifyTrialSession(token, { now, secret })).toBeNull();
  });
  it("refuses to issue an already expired session", () => {
    expect(() => issueTrialSession({ generation, resetsAt }, { now: new Date(resetsAt), secret })).toThrow("refreshed");
  });
});
