import { z } from "zod";

export const AuditActionEnum = z.enum([
  "gmail_disconnected",
  "slack_disconnected",
  "twilio_disconnected",
  "account_deleted",
]);

export type TAuditAction = z.infer<typeof AuditActionEnum>;
