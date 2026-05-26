"use client";
import {
  CalendarCheck,
  CalendarX,
  PhoneCall,
  PaperPlaneRight,
  EnvelopeOpen,
  ChatText,
  CheckCircle,
  PauseCircle,
  ArrowCircleRight,
  ProhibitInset,
  Warning,
  Note,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import type { TLeadEventType } from "@client/shared/types";

const ICON: Record<TLeadEventType, { Icon: Icon; tone: string }> = {
  call_booked: { Icon: CalendarCheck, tone: "text-[oklch(70%_0.10_200)]" },
  no_show: { Icon: CalendarX, tone: "text-[oklch(75%_0.15_70)]" },
  call_completed: { Icon: PhoneCall, tone: "text-[oklch(65%_0.15_145)]" },
  email_sent: { Icon: PaperPlaneRight, tone: "text-muted-foreground" },
  email_opened: { Icon: EnvelopeOpen, tone: "text-muted-foreground" },
  replied: { Icon: ChatText, tone: "text-accent" },
  draft_approved: { Icon: CheckCircle, tone: "text-[oklch(65%_0.15_145)]" },
  draft_held: { Icon: PauseCircle, tone: "text-[oklch(75%_0.15_70)]" },
  state_changed: { Icon: ArrowCircleRight, tone: "text-muted-foreground" },
  unsubscribed: { Icon: ProhibitInset, tone: "text-[oklch(60%_0.18_25)]" },
  bounced: { Icon: Warning, tone: "text-destructive" },
  note_added: { Icon: Note, tone: "text-muted-foreground" },
  sequence_started: { Icon: PaperPlaneRight, tone: "text-primary-soft" },
  sequence_paused: { Icon: PauseCircle, tone: "text-muted-foreground" },
  sequence_resumed: { Icon: ArrowCircleRight, tone: "text-primary-soft" },
  sequence_completed: { Icon: CheckCircle, tone: "text-[oklch(65%_0.15_145)]" },
  sequence_cancelled: { Icon: ProhibitInset, tone: "text-muted-foreground" },
  manually_enrolled: { Icon: ArrowCircleRight, tone: "text-primary-soft" },
};

export function LeadEventIcon({ type }: { type: TLeadEventType }) {
  const { Icon, tone } = ICON[type];
  return <Icon weight="regular" className={`size-5 ${tone}`} aria-hidden="true" />;
}
