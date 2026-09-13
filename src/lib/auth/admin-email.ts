import { z } from "zod";


const emailSchema = z.string().trim().toLowerCase().email();

export function normalizeEmail(value: string): string | null {
  const result = emailSchema.safeParse(value.normalize("NFKC"));
  return result.success ? result.data : null;
}
