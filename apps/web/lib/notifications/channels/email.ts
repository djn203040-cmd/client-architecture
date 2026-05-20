import "server-only";
import { getResendClient } from "@/lib/resend/client";
import { adminClient } from "@/lib/supabase/admin";
import { buildReviewUrl, generateReviewToken } from "@/lib/review-token";
import {
  buildDraftReadyEmail,
  buildDraftFollowupEmail,
  buildHardBounceEmail,
} from "@/lib/email/templates/draft-ready";
import type { TNotificationEvent, TChannelResult } from "@client/shared";

const FROM_ADDRESS = "Sonorous Drafts <drafts@sonorous.com>";

export async function sendEmail(
  event: TNotificationEvent,
): Promise<TChannelResult> {
  const { coachId, eventType, payload } = event;

  // Resolve coach email address
  const { data: coach } = await adminClient
    .from("coaches")
    .select("email, name")
    .eq("id", coachId)
    .single();

  if (!coach?.email) {
    await adminClient.from("notification_log").insert({
      coach_id: coachId,
      channel: "email",
      status: "failed",
      error_message: "coach_email_missing",
    });
    return {
      channel: "email",
      status: "failed",
      external_id: null,
      error_message: "coach_email_missing",
    };
  }

  let templateOut: { html: string; text: string; subject: string };

  try {
    if (eventType === "draft_ready" || eventType === "lead_replied") {
      if (!payload.draftId) {
        throw new Error("draftId required for draft_ready / lead_replied");
      }

      const { data: draft } = await adminClient
        .from("drafts")
        .select("id, review_token_nonce, body, subject")
        .eq("id", payload.draftId)
        .single();

      if (!draft) throw new Error("draft not found");

      const token = generateReviewToken({
        draftId: draft.id,
        coachId,
        nonce: draft.review_token_nonce ?? draft.id,
      });
      const reviewUrl = buildReviewUrl(token);

      const builder =
        eventType === "draft_ready"
          ? buildDraftReadyEmail
          : buildDraftFollowupEmail;

      templateOut = builder({
        leadName: payload.leadName ?? "your lead",
        subject: payload.subject ?? (draft.subject as string) ?? "",
        body: payload.body ?? (draft.body as string) ?? "",
        sendTime: payload.sendTime ?? "soon",
        confidenceLevel: payload.confidenceLevel ?? "high",
        reviewUrl,
        settingsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications`,
        unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications`,
      });
    } else if (eventType === "hard_bounce") {
      templateOut = buildHardBounceEmail({
        leadEmail: payload.leadEmail ?? "unknown",
        leadName: payload.leadName ?? "lead",
        settingsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/leads`,
      });
    } else {
      // integration_broken — minimal notification
      templateOut = {
        subject: "Sonorous integration needs attention",
        html: "<p>One of your integrations needs attention. Please visit your Sonorous dashboard.</p>",
        text: "One of your integrations needs attention. Please visit your Sonorous dashboard.",
      };
    }

    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: coach.email,
      replyTo: coach.email,
      subject: templateOut.subject,
      html: templateOut.html,
      text: templateOut.text,
    });

    if (error || !data) throw error ?? new Error("resend returned no id");

    await adminClient.from("notification_log").insert({
      coach_id: coachId,
      draft_id: payload.draftId ?? null,
      channel: "email",
      external_id: data.id,
      status: "sent",
    });

    return {
      channel: "email",
      status: "sent",
      external_id: data.id,
      error_message: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "send_failed";
    await adminClient.from("notification_log").insert({
      coach_id: coachId,
      draft_id: payload.draftId ?? null,
      channel: "email",
      status: "failed",
      error_message: msg,
    });
    return {
      channel: "email",
      status: "failed",
      external_id: null,
      error_message: msg,
    };
  }
}
