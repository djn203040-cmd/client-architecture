import { sequenceNoShow } from "@/inngest/functions/sequence-no-show";
import { sequenceCallCompleted } from "@/inngest/functions/sequence-call-completed";
import { gmailWatch } from "@/inngest/functions/gmail-watch";
import { gmailMonitor, gmailNotificationReceived } from "@/inngest/functions/gmail-monitor";
import { replyHandler } from "@/inngest/functions/reply-handler";
import { bounceHandler } from "@/inngest/functions/bounce-handler";
import { autonomousModeBTimer } from "@/inngest/functions/autonomous-mode-b-timer";
import { notificationDispatcher } from "@/inngest/functions/notification-dispatcher";
import { draftFollowupCta } from "@/inngest/functions/draft-followup-cta";
import { sendViaGmail } from "@/inngest/functions/send-via-gmail";
import { sequenceScheduledSend } from "@/inngest/functions/sequence-scheduled-send";
import { sequenceReengage } from "@/inngest/functions/sequence-reengage";
import { callOutcomeMonitor } from "@/inngest/functions/call-outcome-monitor";
import { callOutcomePoller } from "@/inngest/functions/call-outcome-poller";
import { dueDraftReconciler } from "@/inngest/functions/due-draft-reconciler";
import { calendarHealthCheck } from "@/inngest/functions/calendar-health-check";

/**
 * The single source of truth for every Inngest function served at /api/inngest.
 *
 * ⚠️ GUARDRAIL — Inngest caps `cancelOn` at 5 events PER FUNCTION. Exceeding it
 * fails the whole-app sync and *silently freezes the entire registry* — every
 * newly-added function stops registering on prod (this was outage #75). Keep
 * every function's `cancelOn` array at ≤ 5. `tests/unit/inngest-registry.test.ts`
 * enforces this (and unique ids) so a violation is a red CI check, not a silent
 * prod freeze.
 */
export const inngestFunctions = [
  sequenceNoShow,
  sequenceCallCompleted,
  gmailWatch,
  gmailMonitor,
  gmailNotificationReceived,
  replyHandler,
  bounceHandler,
  autonomousModeBTimer,
  notificationDispatcher,
  draftFollowupCta,
  sendViaGmail,
  sequenceScheduledSend,
  sequenceReengage,
  callOutcomeMonitor,
  callOutcomePoller,
  dueDraftReconciler,
  calendarHealthCheck,
];
