import { Badge } from "@/components/ui/badge";
import type { TLeadStatus } from "@client/shared/types";

const TONE: Record<TLeadStatus, string> = {
  identified:      "bg-[var(--state-identified-bg)] text-[var(--state-identified-fg)]",
  in_sequence:     "bg-[var(--state-in-sequence-bg)] text-[var(--state-in-sequence-fg)]",
  replied:         "bg-[var(--state-replied-bg)] text-[var(--state-replied-fg)]",
  call_booked:     "bg-[var(--state-call-booked-bg)] text-[var(--state-call-booked-fg)]",
  call_completed:  "bg-[var(--state-call-completed-bg)] text-[var(--state-call-completed-fg)]",
  converted:       "bg-[var(--state-converted-bg)] text-[var(--state-converted-fg)]",
  no_show:         "bg-[var(--state-no-show-bg)] text-[var(--state-no-show-fg)]",
  bounced:         "bg-[var(--state-bounced-bg)] text-[var(--state-bounced-fg)]",
  lost:            "bg-[var(--state-lost-bg)] text-[var(--state-lost-fg)]",
  unsubscribed:    "bg-[var(--state-unsubscribed-bg)] text-[var(--state-unsubscribed-fg)]",
  do_not_contact:  "bg-[var(--state-do-not-contact-bg)] text-[var(--state-do-not-contact-fg)]",
};

export function LeadStateBadge({
  status,
  label,
}: {
  status: TLeadStatus;
  /** Localized label for the status. Callers pass it from their dictionary. */
  label: string;
}) {
  return <Badge className={`${TONE[status]} font-normal`}>{label}</Badge>;
}
