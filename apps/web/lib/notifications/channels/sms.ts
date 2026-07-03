import "server-only";
import { getTwilioClient } from "@/lib/twilio/client";
import { adminClient } from "@/lib/supabase/admin";
import { writeNotificationLog } from "@/lib/notifications/log-write";
import { buildShortReviewUrl, generateReviewToken } from "@/lib/review-token";
import { buildSmsBody, MAX_SMS_LENGTH } from "./sms-body";
import type { TNotificationEvent, TChannelResult } from "@client/shared";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.sonorous.com";

export async function sendSMS(
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
      await writeNotificationLog({
        coach_id: coachId,
        event_type: eventType,
        channel: "sms",
        status: "failed",
        error_message: "coach_phone_missing",
      });
      return {
        channel: "sms",
        status: "failed",
        external_id: null,
        error_message: "coach_phone_missing",
      };
    }

    let body: string;

    if (eventType === "draft_ready" || eventType === "lead_replied") {
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
      const shortLink = buildShortReviewUrl(token);

      body = buildSmsBody({
        variant: (draft.followup_count as number) >= 1 ? "followup" : "initial",
        leadName: payload.leadName,
        shortLink,
      });
    } else if (eventType === "hard_bounce") {
      body = buildSmsBody({
        variant: "bounce",
        leadEmail: payload.leadEmail,
      });
    } else {
      body = payload.provider
        ? `Sonorous: Your ${payload.provider} connection needs attention. Open dashboard to reconnect.`
        : "Sonorous: An integration needs attention. Open dashboard.";
    }

    if (body.length > MAX_SMS_LENGTH) {
      const err = `sms_body_too_long:${body.length}`;
      await writeNotificationLog({
        coach_id: coachId,
        event_type: eventType,
        channel: "sms",
        status: "failed",
        error_message: err,
      });
      return { channel: "sms", status: "failed", external_id: null, error_message: err };
    }

    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    if (!messagingServiceSid) {
      await writeNotificationLog({
        coach_id: coachId,
        event_type: eventType,
        channel: "sms",
        status: "failed",
        error_message: "TWILIO_MESSAGING_SERVICE_SID_missing",
      });
      return {
        channel: "sms",
        status: "failed",
        external_id: null,
        error_message: "TWILIO_MESSAGING_SERVICE_SID_missing",
      };
    }

    const client = getTwilioClient();
    const message = await client.messages.create({
      messagingServiceSid,
      to: coach.phone,
      body,
      statusCallback: `${APP_URL}/api/webhooks/twilio/status`,
    });

    await writeNotificationLog({
      coach_id: coachId,
      draft_id: payload.draftId ?? null,
      event_type: eventType,
      channel: "sms",
      external_id: message.sid,
      status: "sent",
    });

    return {
      channel: "sms",
      status: "sent",
      external_id: message.sid,
      error_message: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "send_failed";
    await writeNotificationLog({
      coach_id: coachId,
      event_type: eventType,
      channel: "sms",
      status: "failed",
      error_message: msg,
    });
    return {
      channel: "sms",
      status: "failed",
      external_id: null,
      error_message: msg,
    };
  }
}
