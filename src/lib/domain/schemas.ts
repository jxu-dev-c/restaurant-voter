import { z } from "zod";

const booleanFromForm = z.preprocess(
  (value) => value === true || value === "true" || value === "on",
  z.boolean(),
);

const optionalText = z.preprocess(
  (value) =>
    value === null || value === undefined ||
    (typeof value === "string" && value.trim() === "")
      ? undefined
      : value,
  z.string().trim().optional(),
);

export const centerSchema = z.object({
  name: z.string().trim().min(2, "Enter a center name.").max(80),
  addressLabel: optionalText.pipe(z.string().max(180).optional()),
  googlePlaceId: optionalText.pipe(z.string().max(255).optional()),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export const createPollSchema = z.object({
  title: z.string().trim().min(3, "Enter a poll title.").max(100),
  lunchCenterId: z.string().uuid("Choose a lunch center."),
  voteLimit: z.coerce.number().int().min(1).max(10),
  nominationLimit: z.coerce.number().int().min(1).max(50),
  nominationsEnabled: booleanFromForm,
});

export const placeSelectionSchema = z.object({
  placeId: z.string().trim().min(8).max(255),
  fallbackLabel: optionalText.pipe(z.string().max(160).optional()),
  acknowledgePreviousWinner: booleanFromForm.default(false),
});

export const ballotSchema = z.object({
  pollId: z.string().uuid(),
  revision: z.coerce.number().int().min(0),
  candidateIds: z.array(z.string().uuid()).max(50),
});

export const candidateIdSchema = z.string().uuid();

export const winnerSchema = z.object({
  placeId: z.string().trim().min(8).max(255),
  fallbackLabel: optionalText.pipe(z.string().max(160).optional()),
  wonOn: z.iso.date(),
  notes: optionalText.pipe(z.string().max(500).optional()),
});

export function formDataObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export function zodFieldErrors(error: z.ZodError) {
  return z.flattenError(error).fieldErrors;
}
