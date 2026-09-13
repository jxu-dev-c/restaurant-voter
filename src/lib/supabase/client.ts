import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnvironment } from "@/lib/env";

export function createBrowserSupabaseClient() {
  const environment = getPublicEnvironment();

  return createBrowserClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
  );
}

