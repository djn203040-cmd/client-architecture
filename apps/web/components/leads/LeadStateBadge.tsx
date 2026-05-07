import { Badge } from "@/components/ui/badge";
import type { TLeadStatus } from "@client/shared/types";

const TONE: Record<TLeadStatus, string> = {
  identified: "bg-muted text-muted-foreground",
  call_booked: "bg-[oklch(70%_0.10_240)] text-white",
  no_show: "bg-[oklch(75%_0.15_70)] text-foreground",
  call_completed: "bg-[oklch(70%_0.10_200)] text-white",
  in_sequence: "bg-accent text-accent-foreground",
  replied: "bg-[oklch(65%_0.15_145)] text-white",
  converted: "bg-[oklch(60%_0.15_145)] text-white",
  closed: "bg-[oklch(60%_0.005_60)] text-white",
  unsubscribed: "bg-[oklch(60%_0.005_60)] text-white",
  do_not_contact: "bg-[oklch(60%_0.18_25)] text-white",
  bounced: "bg-destructive text-destructive-foreground",
};

const LABEL: Record<TLeadStatus, string> = {
  identified: "Identified",
  call_booked: "Call booked",
  no_show: "No show",
  call_completed: "Call completed",
  in_sequence: "In sequence",
  replied: "Replied",
  converted: "Converted",
  closed: "Closed",
  unsubscribed: "Unsubscribed",
  do_not_contact: "Do not contact",
  bounced: "Bounced",
};

export function LeadStateBadge({ status }: { status: TLeadStatus }) {
  return <Badge className={`${TONE[status]} font-normal`}>{LABEL[status]}</Badge>;
}
