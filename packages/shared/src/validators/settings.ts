import { z } from "zod";

// The two languages the product supports. Drives the whole coach-facing UI AND
// the language every AI generator writes in. Backend code / logs stay English.
export const LanguageEnum = z.enum(["en", "da"]);
export type TLanguage = z.infer<typeof LanguageEnum>;
export const DEFAULT_LANGUAGE: TLanguage = "en";

/** Narrows an unknown DB/string value to a supported language, defaulting to 'en'. */
export function coerceLanguage(value: unknown): TLanguage {
  return value === "da" ? "da" : "en";
}

export const TimeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:MM");
export const WorkingHoursSchema = z.object({ start: TimeOfDay, end: TimeOfDay });

export const ProfilePatchSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  role_title: z.string().max(100).nullable().optional(),
  language: LanguageEnum.optional(),
  timezone: z
    .string()
    .refine((tz) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "Invalid IANA timezone")
    .optional(),
  working_hours: WorkingHoursSchema.optional(),
  email_signature: z.string().max(2000).nullable().optional(),
  public_booking_url: z.string().url().nullable().optional(),
});

export type TProfilePatch = z.infer<typeof ProfilePatchSchema>;
