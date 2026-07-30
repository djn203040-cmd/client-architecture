/**
 * How long a draft may sit in the transient `sending` status (#139) before it is
 * treated as a crashed send rather than one still in flight. A real send takes
 * seconds; Inngest exhausts its 3 retries of the deliver/record steps well
 * inside this window.
 *
 * Shared deliberately: the reconciler's stuck-`sending` sweep and the /admin
 * surface that lists stuck sends MUST use the same threshold. If they drift, the
 * panel either hides drafts the reconciler has already given up on, or raises an
 * alarm on sends that are still perfectly healthy.
 */
export const STUCK_SENDING_MINUTES = 15;

/** ISO timestamp before which a `sending` draft counts as stuck. */
export function stuckSendingCutoff(now: number = Date.now()): string {
  return new Date(now - STUCK_SENDING_MINUTES * 60_000).toISOString();
}
