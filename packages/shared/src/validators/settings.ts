import { z } from "zod";

export const TimeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:MM");
export const WorkingHoursSchema = z.object({ start: TimeOfDay, end: TimeOfDay });

export const ProfilePatchSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  role_title: z.string().max(100).nullable().optional(),
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
