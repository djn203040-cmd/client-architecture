import { z } from "zod";

export const LeadSourceEnum = z.enum([
  "calendly",
  "cal_com",
  "acuity",
  "setmore",
  "square",
  "ms_bookings",
  "tidycal",
  "manual",
  "gmail_detected",
  "instagram_detected",
  "referral",
]);

export const LeadStatusEnum = z.enum([
  "identified",
  "call_booked",
  "no_show",
  "call_completed",
  "in_sequence",
  "replied",
  "converted",
  "closed",
  "unsubscribed",
  "do_not_contact",
  "bounced",
]);

export const CreateLeadSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  email: z.string().email("Enter a valid email"),
  phone: z.string().max(50).optional().nullable(),
  source: LeadSourceEnum,
  coach_notes: z.string().max(5000).optional().nullable(),
});

export const UpdateLeadSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(50).optional().nullable(),
  coach_notes: z.string().max(5000).optional().nullable(),
  status: LeadStatusEnum.optional(),
  do_not_contact: z.boolean().optional(),
});

export type TCreateLeadInput = z.infer<typeof CreateLeadSchema>;
export type TUpdateLeadInput = z.infer<typeof UpdateLeadSchema>;
