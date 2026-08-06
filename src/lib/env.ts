import { z } from "zod";

export class EnvironmentConfigurationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(
      `Invalid environment configuration:\n${issues
        .map((issue) => `- ${issue}`)
        .join("\n")}`,
    );
    this.name = "EnvironmentConfigurationError";
    this.issues = issues;
  }
}

const optionalNonEmptyString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0
      ? undefined
      : value,
  z.string().trim().min(1).optional(),
);

const publicEnvironmentSchema = z.object({
  appUrl: z
    .string({ error: "NEXT_PUBLIC_APP_URL is required" })
    .url("NEXT_PUBLIC_APP_URL must be an absolute http(s) URL")
    .refine(
      (value) => ["http:", "https:"].includes(new URL(value).protocol),
      "NEXT_PUBLIC_APP_URL must use http or https",
    )
    .transform((value) => value.replace(/\/$/, "")),
  supabaseUrl: z
    .string({ error: "NEXT_PUBLIC_SUPABASE_URL is required" })
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL")
    .transform((value) => value.replace(/\/$/, "")),
  supabasePublishableKey: z
    .string({
      error:
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required (NEXT_PUBLIC_SUPABASE_ANON_KEY is accepted as a legacy fallback)",
    })
    .trim()
    .min(
      1,
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must not be empty",
    ),
  googleMapsBrowserKey: optionalNonEmptyString,
  googleMapId: optionalNonEmptyString,
});

const serverEnvironmentSchema = publicEnvironmentSchema.extend({
  supabaseServiceRoleKey: z
    .string({ error: "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required" })
    .trim()
    .min(1, "Supabase server key must not be empty"),
  adminEmail: z
    .string({ error: "ADMIN_EMAIL is required" })
    .trim()
    .toLowerCase()
    .email("ADMIN_EMAIL must be a valid email address"),
  referralSigningSecret: z
    .string({
      error:
        "REFERRAL_SIGNING_SECRET is required (TOKEN_SIGNING_SECRET is accepted as a legacy fallback)",
    })
    .min(32, "REFERRAL_SIGNING_SECRET must be at least 32 characters"),
  cookieSigningSecret: z
    .string({
      error:
        "COOKIE_SIGNING_SECRET is required (TOKEN_SIGNING_SECRET is accepted as a legacy fallback)",
    })
    .min(32, "COOKIE_SIGNING_SECRET must be at least 32 characters"),
  deviceHashSecret: z
    .string({
      error:
        "DEVICE_HASH_SECRET is required (TOKEN_SIGNING_SECRET is accepted as a legacy fallback)",
    })
    .min(32, "DEVICE_HASH_SECRET must be at least 32 characters"),
  googleMapsServerKey: optionalNonEmptyString,
  googlePlacesApiKey: optionalNonEmptyString,
  googleRoutesApiKey: optionalNonEmptyString,
});

export type PublicEnvironment = Readonly<
  z.infer<typeof publicEnvironmentSchema>
>;
export type ServerEnvironment = Readonly<
  z.infer<typeof serverEnvironmentSchema>
>;

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

let cachedPublicEnvironment: PublicEnvironment | undefined;
let cachedServerEnvironment: ServerEnvironment | undefined;

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value !== undefined && value.trim().length > 0);
}

function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => issue.message);
}

function parseWithHelpfulErrors<T>(
  schema: z.ZodType<T>,
  source: unknown,
): T {
  const result = schema.safeParse(source);

  if (!result.success) {
    throw new EnvironmentConfigurationError(formatIssues(result.error));
  }

  return Object.freeze(result.data);
}

function publicEnvironmentValues(source: EnvironmentSource) {
  return {
    appUrl: firstNonEmpty(
      source.NEXT_PUBLIC_APP_URL,
      source.APP_URL,
      source.VERCEL_URL ? `https://${source.VERCEL_URL}` : undefined,
    ),
    supabaseUrl: source.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: firstNonEmpty(
      source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    googleMapsBrowserKey: firstNonEmpty(
      source.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY,
      source.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    ),
    googleMapId: source.NEXT_PUBLIC_GOOGLE_MAP_ID,
  };
}

export function parsePublicEnvironment(
  source: EnvironmentSource,
): PublicEnvironment {
  return parseWithHelpfulErrors(
    publicEnvironmentSchema,
    publicEnvironmentValues(source),
  );
}

export function parseServerEnvironment(
  source: EnvironmentSource,
): ServerEnvironment {
  const legacySigningSecret = source.TOKEN_SIGNING_SECRET;

  return parseWithHelpfulErrors(serverEnvironmentSchema, {
    ...publicEnvironmentValues(source),
    supabaseServiceRoleKey: firstNonEmpty(
      source.SUPABASE_SECRET_KEY,
      source.SUPABASE_SERVICE_ROLE_KEY,
    ),
    adminEmail: source.ADMIN_EMAIL,
    referralSigningSecret: firstNonEmpty(
      source.REFERRAL_SIGNING_SECRET,
      legacySigningSecret,
    ),
    cookieSigningSecret: firstNonEmpty(
      source.COOKIE_SIGNING_SECRET,
      legacySigningSecret,
    ),
    deviceHashSecret: firstNonEmpty(
      source.DEVICE_HASH_SECRET,
      legacySigningSecret,
    ),
    googleMapsServerKey: firstNonEmpty(
      source.GOOGLE_MAPS_SERVER_KEY,
      source.GOOGLE_PLACES_API_KEY,
      source.GOOGLE_ROUTES_API_KEY,
    ),
    googlePlacesApiKey: firstNonEmpty(
      source.GOOGLE_MAPS_SERVER_KEY,
      source.GOOGLE_PLACES_API_KEY,
    ),
    googleRoutesApiKey: firstNonEmpty(
      source.GOOGLE_MAPS_SERVER_KEY,
      source.GOOGLE_ROUTES_API_KEY,
    ),
  });
}

function currentPublicEnvironmentSource(): EnvironmentSource {
  return {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    APP_URL: process.env.APP_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY,
    NEXT_PUBLIC_GOOGLE_MAP_ID: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID,
  };
}

function currentServerEnvironmentSource(): EnvironmentSource {
  return {
    ...currentPublicEnvironmentSource(),
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    REFERRAL_SIGNING_SECRET: process.env.REFERRAL_SIGNING_SECRET,
    COOKIE_SIGNING_SECRET: process.env.COOKIE_SIGNING_SECRET,
    DEVICE_HASH_SECRET: process.env.DEVICE_HASH_SECRET,
    TOKEN_SIGNING_SECRET: process.env.TOKEN_SIGNING_SECRET,
    GOOGLE_MAPS_SERVER_KEY: process.env.GOOGLE_MAPS_SERVER_KEY,
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
    GOOGLE_ROUTES_API_KEY: process.env.GOOGLE_ROUTES_API_KEY,
  };
}

export function getPublicEnvironment(): PublicEnvironment {
  cachedPublicEnvironment ??= parsePublicEnvironment(
    currentPublicEnvironmentSource(),
  );
  return cachedPublicEnvironment;
}

export function getServerEnvironment(): ServerEnvironment {
  if (typeof window !== "undefined") {
    throw new Error("Server environment variables cannot be read in a browser");
  }

  cachedServerEnvironment ??= parseServerEnvironment(
    currentServerEnvironmentSource(),
  );
  return cachedServerEnvironment;
}
