import type { TLeadStatus } from "../types";

export const TERMINAL_STATES: readonly TLeadStatus[] = [
  "converted",
  "closed",
  "unsubscribed",
  "do_not_contact",
  "bounced",
] as const;

export function isTerminalState(s: TLeadStatus): boolean {
  return (TERMINAL_STATES as readonly string[]).includes(s);
}

export function blocksOutboundEmail(s: TLeadStatus, doNotContact: boolean): boolean {
  return doNotContact || isTerminalState(s);
}
