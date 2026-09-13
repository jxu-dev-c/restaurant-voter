import { z } from "zod";

export const MAX_DISPLAY_NAME_LENGTH = 50;

const FORBIDDEN_CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/u;
const BIDI_OVERRIDE_CHARACTERS = /[\u202A-\u202E\u2066-\u2069]/u;

export function normalizeDisplayName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

export const displayNameSchema = z
  .string()
  .transform(normalizeDisplayName)
  .pipe(
    z
      .string()
      .min(1, "Enter a display name")
      .refine(
        (value) => Array.from(value).length <= MAX_DISPLAY_NAME_LENGTH,
        `Display names must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer`,
      )
      .refine(
        (value) => !FORBIDDEN_CONTROL_CHARACTERS.test(value),
        "Display names cannot contain control characters",
      )
      .refine(
        (value) => !BIDI_OVERRIDE_CHARACTERS.test(value),
        "Display names cannot contain bidirectional override characters",
      ),
  );

export function parseDisplayName(value: unknown): string {
  return displayNameSchema.parse(value);
}

export function escapeDisplayName(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "'": "&#39;",
        '"': "&quot;",
        "<": "&lt;",
        ">": "&gt;",
      })[character] ?? character,
  );
}

