import "server-only";
import { getTwilioClient } from "@/lib/twilio/client";
import { adminClient } from "@/lib/supabase/admin";
import { buildReviewUrl, generateReviewToken } from "@/lib/review-token";
import { WHATSAPP_TEMPLATES, type WhatsAppTemplateKey } from "./whatsapp-templates";
import type { TNotificationEvent, TChannelResult } from "@client/shared";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.sonorous.com";

function whatsappTo(phone: string): string {
  return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
}

function whatsappFrom(): string {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) throw new Error("TWILIO_WHATSAPP_FROM not set");
  return from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
}

export async function sendWhatsApp(
  event: TNotificationEvent,
): Promise<TChannelResult> {
  const { coachId, eventType, payload } = event;

  try {
    const { data: coach } = await adminClient
      .from("coaches")
      .select("phone")
      .eq("id", coachId)
      .single();

    if (!coach?.phone) {
      await adminClient.from("notification_log").insert({
        coach_id: coachId,
        event_type: eventType,
        channel: "whatsapp",
        status: "failed",
        error_message: "coach_phone_missing",
      });
      return {
        channel: "whatsapp",
        status: "failed",
        external_id: null,
        error_message: "coach_phone_missing",
      };
    }

    if (eventType !== "draft_ready" && eventType !== "lead_replied") {
      // hard_bounce + integration_broken: no approved WhatsApp template in Phase 4
      await adminClient.from("notification_log").insert({
        coach_id: coachId,
        event_type: eventType,
        channel: "whatsapp",
        status: "failed",
        error_message: "no_template_for_event_type",
      });
      return {
        channel: "whatsapp",
        status: "failed",
        external_id: null,
        error_message: "no_template_for_event_type",
      };
    }

    if (!payload.draftId) throw new Error("draftId required");

    const { data: draft } = await adminClient
      .from("drafts")
      .select("id, review_token_nonce, followup_count")
      .eq("id", payload.draftId)
      .single();

    if (!draft) throw new Error("draft_not_found");

    const token = generateReviewToken({
      draftId: draft.id,
      coachId,
      nonce: draft.review_token_nonce ?? draft.id,
    });
    const reviewUrl = buildReviewUrl(token);

    const isFollowup = (draft.followup_count as number) >= 1;
    const templateKey: WhatsAppTemplateKey = isFollowup
      ? "draft_followup"
      : "draft_ready";

    const variables: Record<string, string> = isFollowup
      ? {
          "1": payload.leadName ?? "your lead",
          "2": reviewUrl,
        }
      : {
          "1": payload.leadName ?? "your lead",
          "2": payload.sendTime ?? "soon",
          "3": reviewUrl,
        };

    const template = WHATSAPP_TEMPLATES[templateKey];
    const contentSid = process.env[template.contentSidEnvVar];

    if (!contentSid) {
      await adminClient.from("notification_log").insert({
        coach_id: coachId,
        event_type: eventType,
        channel: "whatsapp",
        status: "failed",
        error_message: `${template.contentSidEnvVar}_missing`,
      });
      return {
        channel: "whatsapp",
        status: "failed",
        external_id: null,
        error_message: `${template.contentSidEnvVar}_missing`,
      };
    }

    const client = getTwilioClient();
    const message = await client.messages.create({
      from: whatsappFrom(),
      to: whatsappTo(coach.phone),
      contentSid,
      contentVariables: JSON.stringify(variables),
      statusCallback: `${APP_URL}/api/webhooks/twilio/status`,
    });

    await adminClient.from("notification_log").insert({
      coach_id: coachId,
      draft_id: payload.draftId ?? null,
      event_type: eventType,
      channel: "whatsapp",
      external_id: message.sid,
      status: "sent",
    });

    return {
      channel: "whatsapp",
      status: "sent",
      external_id: message.sid,
      error_message: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "send_failed";
    await adminClient.from("notification_log").insert({
      coach_id: coachId,
      event_type: eventType,
      channel: "whatsapp",
      status: "failed",
      error_message: msg,
    });
    return {
      channel: "whatsapp",
      status: "failed",
      external_id: null,
      error_message: msg,
    };
  }
}
