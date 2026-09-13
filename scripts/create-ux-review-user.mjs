import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.UX_SUPABASE_URL;
const secretKey = process.env.UX_SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  throw new Error("Local Supabase URL and secret key are required");
}

const parsedUrl = new URL(supabaseUrl);
if (!/^(127\.0\.0\.1|localhost)$/.test(parsedUrl.hostname)) {
  throw new Error(`Refusing to create UX fixtures outside local Supabase: ${parsedUrl.hostname}`);
}

const admin = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false },
});
const { data, error } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: "admin@example.com",
});

if (error || !data.properties?.hashed_token || !data.properties.verification_type) {
  throw new Error(`Unable to create the UX review organizer: ${error?.message ?? "missing sign-in token"}`);
}

const params = new URLSearchParams({
  token_hash: data.properties.hashed_token,
  type: data.properties.verification_type,
  next: "/admin",
});

process.stdout.write(`/auth/callback?${params.toString()}`);
