import { z } from "zod";

export const AuditActionEnum = z.enum([
  // Integration lifecycle
  "gmail_disconnected",
  "slack_disconnected",
  "twilio_disconnected",
  // Account lifecycle
  "account_deleted",
  // GDPR (Phase 6 / 06-02)
  "gdpr_export",
  "gdpr_delete",
  // Admin actions (Phase 6 / 06-02)
  "admin_create_coach",
  "admin_revoke_coach",
  "admin_reassign_integration",
  "admin_invite_coach",
  "admin_resend_invite",
  // Security events
  "rate_limit_triggered",
  "auth_failed_admin",
]);

export type TAuditAction = z.infer<typeof AuditActionEnum>;
