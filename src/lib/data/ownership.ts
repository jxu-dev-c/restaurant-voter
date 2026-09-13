import "server-only";

import type { User } from "@supabase/supabase-js";
import { cache } from "react";

import { assertAdmin, requireAdmin } from "@/lib/auth/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type Organizer = {
  id: string;
  email: string;
  teamId: string;
  teamName: string;
  teamSlug: string;
};

/**
 * Keyed on primitives so the layout and the page under it share one allowlist
 * query per request instead of issuing the same join twice.
 */
const organizerForEmail = cache(async (userId: string, email: string): Promise<Organizer> => {
  const { data, error } = await createServiceRoleClient()
    .from("organizer_email_allowlist")
    .select("team_id,teams!inner(name,slug)")
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(`Unable to authorize organizer team: ${error.message}`);
  if (!data) throw new Error("Organizer is not assigned to a team");
  const team = Array.isArray(data.teams) ? data.teams[0] : data.teams;
  if (!team) throw new Error("Organizer team is unavailable");
  return {
    id: userId,
    email,
    teamId: data.team_id,
    teamName: team.name,
    teamSlug: team.slug,
  };
});

function organizerForUser(user: User): Promise<Organizer> {
  if (!user.email) throw new Error("Organizer email is unavailable");
  return organizerForEmail(user.id, user.email.toLowerCase().trim());
}

/** Resolve identity and team from server-owned data, never submitted form data. */
export async function requireOrganizer() {
  return organizerForUser(await assertAdmin());
}

/** Page reads redirect unauthenticated visitors while enforcing the same team lookup. */
export async function requireOrganizerPage(options: { returnTo?: string } = {}) {
  return organizerForUser(await requireAdmin(options));
}

export async function requireOwnedPoll(pollId: string) {
  const organizer = await requireOrganizer();
  const { data, error } = await createServiceRoleClient()
    .from("polls")
    .select("id")
    .eq("id", pollId)
    .eq("team_id", organizer.teamId)
    .maybeSingle();
  if (error) throw new Error(`Unable to authorize poll: ${error.message}`);
  if (!data) throw new Error("Poll not found or access denied");
  return organizer;
}
