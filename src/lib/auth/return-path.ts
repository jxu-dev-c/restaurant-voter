export function sanitizeReturnPath(
  value: string | null | undefined,
  fallback = "/admin",
): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001F\u007F]/u.test(value)
  ) {
    return fallback;
  }

  const parsed = new URL(value, "https://restaurant-voter.invalid");
  if (parsed.origin !== "https://restaurant-voter.invalid") {
    return fallback;
  }

  if (parsed.pathname.startsWith("/auth/")) {
    return fallback;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

