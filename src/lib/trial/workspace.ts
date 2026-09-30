import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { z } from "zod";

import { createSecureCookieOptions, shouldUseSecureCookies } from "@/lib/security/cookie-options";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { TRIAL_COOKIE_NAME, TRIAL_ORGANIZER_EMAIL, TRIAL_TEAM_ID, TRIAL_TEAM_SLUG } from "./constants";
import { issueTrialSession, verifyTrialSession } from "./token";

const workspaceSchema = z.object({
  team_id: z.literal(TRIAL_TEAM_ID),
  generation: z.uuid(),
  resets_at: z.iso.datetime({ offset: true }),
  voting_public_id: z.string().min(12),
  voting_access_version: z.number().int().positive(),
});

export class TrialSessionExpiredError extends Error {
  constructor() {
    super("Your trial session has ended. Reopen the trial from the homepage.");
    this.name = "TrialSessionExpiredError";
  }
}

export async function ensureTrialWorkspace() {
  const { data, error } = await createServiceRoleClient().rpc("ensure_trial_workspace");
  if (error) throw new Error(`Unable to prepare trial workspace: ${error.message}`);
  return workspaceSchema.parse(Array.isArray(data) ? data[0] : data);
}

export async function startTrialOrganizer(workspace: z.infer<typeof workspaceSchema>) {
  const now = new Date();
  const { token } = issueTrialSession({
    generation: workspace.generation, resetsAt: workspace.resets_at,
  }, { now });
  // Keep the workspace selector after token expiry. A stale trial tab must fail
  // closed rather than falling back to a preserved production sign-in.
  (await cookies()).set(TRIAL_COOKIE_NAME, token, {
    httpOnly: true, path: "/", priority: "high", sameSite: "lax", secure: shouldUseSecureCookies(),
  });
}

export const getTrialOrganizer = cache(async () => {
  const value = (await cookies()).get(TRIAL_COOKIE_NAME)?.value;
  if (!value) return null;
  const session = verifyTrialSession(value);
  if (!session) throw new TrialSessionExpiredError();

  // A signed cookie grants only the reserved team, and resets revoke old sessions.
  const { data, error } = await createServiceRoleClient()
    .from("trial_workspace")
    .select("generation,resets_at,teams!inner(id,slug,name,is_trial)")
    .eq("team_id", TRIAL_TEAM_ID)
    .maybeSingle();
  if (error) throw new Error(`Unable to verify trial workspace: ${error.message}`);
  const team = Array.isArray(data?.teams) ? data.teams[0] : data?.teams;
  if (!data || data.generation !== session.generation || new Date(data.resets_at).getTime() <= Date.now()
    || !team?.is_trial || team.id !== TRIAL_TEAM_ID || team.slug !== TRIAL_TEAM_SLUG) throw new TrialSessionExpiredError();
  return {
    id: null,
    email: TRIAL_ORGANIZER_EMAIL,
    teamId: TRIAL_TEAM_ID,
    teamName: team.name as string,
    teamSlug: TRIAL_TEAM_SLUG,
    trialResetsAt: data.resets_at as string,
  };
});

export async function clearTrialSession() {
  (await cookies()).set(TRIAL_COOKIE_NAME, "", createSecureCookieOptions(0));
}

export async function getTrialResetDate() {
  const { data, error } = await createServiceRoleClient()
    .from("trial_workspace").select("resets_at").eq("team_id", TRIAL_TEAM_ID).single();
  if (error) throw new Error(`Unable to load trial reset date: ${error.message}`);
  return data.resets_at as string;
}
