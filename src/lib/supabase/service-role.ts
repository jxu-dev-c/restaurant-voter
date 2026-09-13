import "server-only";

import { cache } from "react";
import { createClient } from "@supabase/supabase-js";

import { getServerEnvironment } from "@/lib/env";

/**
 * One service-role client per request. A single admin render calls this four to
 * six times (auth lookup, team lookup, then each list query), and every
 * `createClient` rebuilds the auth/postgrest/storage stack for nothing.
 */
export const createServiceRoleClient = cache(() => {
  const environment = getServerEnvironment();

  return createClient(
    environment.supabaseUrl,
    environment.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
});
