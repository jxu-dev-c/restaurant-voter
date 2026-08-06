import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicEnvironment } from "@/lib/env";

export async function createServerSupabaseClient() {
  const environment = getPublicEnvironment();
  const cookieStore = await cookies();

  return createServerClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot write cookies. The root proxy refreshes
            // sessions before rendering; Route Handlers and Server Actions can
            // write successfully through this same adapter.
          }
        },
      },
    },
  );
}

