import { z } from "zod";

/**
 * Operator actions on a draft stranded in `sending` (#139).
 *
 * `check`     — read-only: ask the coach's Gmail whether the email actually went out.
 * `mark_sent` — it did: finish the interrupted bookkeeping, never re-send.
 * `resend`    — it did not: release the claim and re-queue the send.
 */
export const StuckSendActionEnum = z.enum(["check", "mark_sent", "resend"]);

export const ResolveStuckSendSchema = z.object({
  draftId: z.string().uuid("A draft id is required"),
  action: StuckSendActionEnum,
});

export type TStuckSendAction = z.infer<typeof StuckSendActionEnum>;
export type TResolveStuckSendInput = z.infer<typeof ResolveStuckSendSchema>;
