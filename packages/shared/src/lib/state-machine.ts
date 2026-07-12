import type { TLeadStatus } from "../types";

/**
 * D-01 (Phase 7): "converted" is a LIVE client, not a dead lead. It must stay
 * fully sendable (reply-driven + approved drafts still go out), it is only
 * excluded from AUTO-nurture / re-engagement enrollment. So the old single
 * TERMINAL_STATES list is split into two explicit sets:
 *
 *   - SEND_BLOCK_STATES, hard-blocks OUTBOUND SEND. "converted" is ABSENT.
 *   - NURTURE_BLOCK_STATES, blocks AUTO-ENROLLMENT. "converted" is PRESENT.
 *
 * Use SEND_BLOCK_STATES for outbound-send gates (runPreSendSafetyCheck);
 * use NURTURE_BLOCK_STATES for auto-enrollment / re-engagement / "start a new
 * nurture sequence" gates.
 */
// prettier-ignore
export const SEND_BLOCK_STATES = ["lost", "unsubscribed", "do_not_contact", "bounced"] as const satisfies readonly TLeadStatus[];

// prettier-ignore
export const NURTURE_BLOCK_STATES = [...SEND_BLOCK_STATES, "converted"] as const satisfies readonly TLeadStatus[];

/**
 * Back-compat alias. Use SEND_BLOCK_STATES for outbound-send gates;
 * NURTURE_BLOCK_STATES for auto-enrollment gates. Aliases the nurture set so
 * existing isTerminalState callers keep their original (converted-inclusive)
 * semantics.
 */
export const TERMINAL_STATES: readonly TLeadStatus[] = NURTURE_BLOCK_STATES;

/** True when a fresh auto-nurture / re-engagement sequence must NOT start. */
export function isNurtureBlocked(s: TLeadStatus): boolean {
  return (NURTURE_BLOCK_STATES as readonly string[]).includes(s);
}

/** True when an OUTBOUND SEND must be hard-blocked (converted returns false). */
export function isSendBlocked(s: TLeadStatus, doNotContact: boolean): boolean {
  return doNotContact || (SEND_BLOCK_STATES as readonly string[]).includes(s);
}

/**
 * Back-compat: delegates to NURTURE_BLOCK_STATES so UI gates that ask "is this
 * lead done?" keep treating converted as a stopped-nurture state.
 */
export function isTerminalState(s: TLeadStatus): boolean {
  return isNurtureBlocked(s);
}

/**
 * Whether outbound email must be blocked. Delegates to isSendBlocked so a
 * converted client is NO LONGER blocked from receiving reply-driven / approved
 * drafts (D-01).
 */
export function blocksOutboundEmail(s: TLeadStatus, doNotContact: boolean): boolean {
  return isSendBlocked(s, doNotContact);
}
