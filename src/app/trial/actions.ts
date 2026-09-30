"use server";

import { redirect } from "next/navigation";

import { logServerError } from "@/lib/observability/logger";
import { setPollAccessGrant } from "@/lib/security/poll-cookies";
import { clearTrialSession, ensureTrialWorkspace, startTrialOrganizer } from "@/lib/trial/workspace";

export async function tryOrganizer(): Promise<void> {
  try {
    await startTrialOrganizer(await ensureTrialWorkspace());
  } catch (error) {
    logServerError("trial.organizer.start_failed", error);
    redirect("/trial/unavailable");
  }
  redirect("/admin");
}

export async function tryVoting(): Promise<void> {
  let publicId: string;
  try {
    const workspace = await ensureTrialWorkspace();
    await setPollAccessGrant({
      pollPublicId: workspace.voting_public_id,
      accessVersion: workspace.voting_access_version,
    });
    publicId = workspace.voting_public_id;
  } catch (error) {
    logServerError("trial.voting.start_failed", error);
    redirect("/trial/unavailable");
  }
  redirect(`/poll/${encodeURIComponent(publicId)}`);
}

export async function leaveTrial(): Promise<void> {
  await clearTrialSession();
  redirect("/");
}
