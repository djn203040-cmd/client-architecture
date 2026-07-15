import "server-only";
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { verifySlackSignature } from "@/lib/slack/signature";
import { getSlackClientForCoach } from "@/lib/slack/client";
import {
  buildApprovedBlocks,
  buildHeldBlocks,
  buildEditModalView,
  buildEditedApprovedBlocks,
  buildCallOutcomeResolvedBlocks,
} from "@/lib/slack/blocks";
import { approveDraftAtomic, holdDraftAtomic } from "@/lib/drafts/approve-atomic";
import { inngest } from "@/inngest/client";
import { runPreSendSafetyCheck } from "@/inngest/functions/sequence-step";
import { recordCallOutcomeAtomic } from "@/lib/call-outcomes/record-atomic";
import { fireCallOutcomeDownstream } from "@/lib/call-outcomes/downstream";
import type { TCallOutcomeValue, TLeadEventType } from "@client/shared";

// call_outcome_<x> action_id -> the chosen outcome value (D-18). Stable contract
// shared with buildCallOutcomeBlocks (07-01) and the PATCH route.
const CALL_OUTCOME_ACTIONS: Record<string, TCallOutcomeValue> = {
  call_outcome_no_show: "no_show",
  call_outcome_completed: "completed",
  call_outcome_converted: "converted",
};
const OUTCOME_EVENT: Record<TCallOutcomeValue, TLeadEventType> = {
  no_show: "no_show",
  completed: "call_completed",
  converted: "call_converted",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SlackUser {
  id: string;
  team_id: string;
}
interface SlackAction {
  action_id: string;
  value: string;
  block_id: string;
}
interface BlockActionsPayload {
  type: "block_actions";
  user: SlackUser;
  actions: SlackAction[];
  response_url: string;
  trigger_id: string;
}
interface ViewSubmissionPayload {
  type: "view_submission";
  user: SlackUser;
  view: {
    callback_id: string;
    private_metadata: string;
    state: { values: Record<string, Record<string, { value: string }>> };
  };
}

type SlackPayload = BlockActionsPayload | ViewSubmissionPayload;

async function findCoachIdByTeam(
  teamId: string,
): Promise<{ ok: true; coachId: string } | { ok: false; reason: "not_found" | "multi_coach" }> {
  const { data, error } = await adminClient
    .from("integrations")
    .select("coach_id")
    .eq("provider", "slack")
    .eq("status", "connected")
    .contains("metadata", { team_id: teamId })
    .maybeSingle();
  // W-4: PGRST116 = multiple rows returned by .maybeSingle()
  if (error?.code === "PGRST116") return { ok: false, reason: "multi_coach" };
  if (!data?.coach_id) return { ok: false, reason: "not_found" };
  return { ok: true, coachId: data.coach_id as string };
}

async function respondViaResponseUrl(responseUrl: string, body: object) {
  await fetch(responseUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export async function POST(req: Request) {
  // RAW body FIRST, Pitfall 2: body must be read before any parsing
  const rawBody = await req.text();

  const valid = verifySlackSignature({
    signingSecret: process.env.SLACK_SIGNING_SECRET ?? "",
    timestamp: req.headers.get("x-slack-request-timestamp") ?? "",
    signature: req.headers.get("x-slack-signature") ?? "",
    rawBody,
  });
  if (!valid) return new NextResponse("Unauthorized", { status: 401 });

  const params = new URLSearchParams(rawBody);
  const rawPayload = params.get("payload");
  if (!rawPayload) return new NextResponse("Bad Request", { status: 400 });

  let payload: SlackPayload;
  try {
    payload = JSON.parse(rawPayload) as SlackPayload;
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // ---- block_actions: Approve / Edit / Hold ----
  if (payload.type === "block_actions") {
    const action = payload.actions[0];
    if (!action) return NextResponse.json({ ok: false, reason: "no_action" });

    const draftId = action.value;
    const lookup = await findCoachIdByTeam(payload.user.team_id);

    if (!lookup.ok) {
      if (lookup.reason === "multi_coach") {
        await respondViaResponseUrl(payload.response_url, {
          response_type: "ephemeral",
          text: "This workspace has multiple coaches, please reinstall Sonorous for your account.",
        });
      }
      return NextResponse.json({ ok: false, error: lookup.reason }, { status: 200 });
    }
    const coachId = lookup.coachId;

    // ---- Call Outcomes: No show / Call completed / Converted (D-18) ----
    if (action.action_id.startsWith("call_outcome_")) {
      const outcome = CALL_OUTCOME_ACTIONS[action.action_id];
      if (!outcome) {
        return NextResponse.json({ ok: false, reason: "unknown_action" }, { status: 200 });
      }
      const callOutcomeId = action.value;

      // Ownership: the resolved coach (from the signed team_id) MUST own this
      // outcome row, a forged/cross-team click can't resolve someone else's call
      // (T-07-15). On mismatch / missing row we 200-ack with no action.
      const { data: row } = await adminClient
        .from("call_outcomes")
        .select("coach_id, lead_id")
        .eq("id", callOutcomeId)
        .maybeSingle();
      if (!row || row.coach_id !== coachId) {
        return NextResponse.json({ ok: true });
      }

      // CAS resolve. On !ok (already resolved elsewhere / late provider no_show)
      // still retire the buttons below for idempotent UX, but never re-fire
      // downstream (T-07-16).
      const result = await recordCallOutcomeAtomic(callOutcomeId, outcome, "slack");
      if (result.ok) {
        await adminClient.from("lead_events").insert({
          coach_id: row.coach_id,
          lead_id: row.lead_id,
          event_type: OUTCOME_EVENT[outcome],
          triggered_by: "coach",
          payload: { source: "slack", callOutcomeId },
        });
        await fireCallOutcomeDownstream({
          outcome,
          coachId: row.coach_id,
          leadId: row.lead_id,
          callOutcomeId,
        });
      }

      // Retire the prompt buttons on this very message (replace_original keeps the
      // 3s budget; the cross-surface sync helper covers dashboard/lead-profile
      // resolves). Done on both ok and !ok so a stale prompt never lingers.
      await respondViaResponseUrl(payload.response_url, {
        replace_original: true,
        blocks: buildCallOutcomeResolvedBlocks(outcome),
      });
      return NextResponse.json({ ok: true });
    }

    if (action.action_id === "draft_approve") {
      const { data: draft } = await adminClient
        .from("drafts")
        .select("lead_id, sequence_id, coach_id")
        .eq("id", draftId)
        .single();

      // Ownership: the coach resolved from the signed team_id MUST own this
      // draft (mirrors the call-outcome branch, T-07-15). Prevents a mis-mapped
      // workspace from approving another coach's draft.
      if (!draft || draft.coach_id !== coachId) {
        await respondViaResponseUrl(payload.response_url, {
          response_type: "ephemeral",
          text: "This draft no longer exists.",
        });
        return NextResponse.json({ ok: true });
      }

      const blocked = await runPreSendSafetyCheck(
        draft.lead_id as string,
        draft.sequence_id as string | null,
      );
      if (blocked) {
        await respondViaResponseUrl(payload.response_url, {
          response_type: "ephemeral",
          text: `Couldn't send (${blocked}).`,
        });
        return NextResponse.json({ ok: true });
      }

      const result = await approveDraftAtomic(draftId, "slack");
      if (!result.ok) {
        await respondViaResponseUrl(payload.response_url, {
          response_type: "ephemeral",
          text: "This draft was already approved from another channel.",
        });
        return NextResponse.json({ ok: true });
      }

      // B-1: emit manual-approved event so sleeping Inngest timers cancel
      await inngest.send({ name: "draft/approved_manually", data: { draftId, coachId } });
      // Defer Gmail send to Inngest, Pitfall 3: keep handler under 3s
      await inngest.send({
        name: "draft/send_via_gmail",
        data: { draftId, coachId, source: "slack" },
      });

      await respondViaResponseUrl(payload.response_url, {
        replace_original: true,
        blocks: buildApprovedBlocks(formatTime(new Date())),
      });
      return NextResponse.json({ ok: true });
    }

    if (action.action_id === "draft_hold") {
      // Ownership check before mutating (holdDraftAtomic is keyed only by draftId).
      const { data: holdDraft } = await adminClient
        .from("drafts")
        .select("coach_id")
        .eq("id", draftId)
        .single();
      if (!holdDraft || holdDraft.coach_id !== coachId) {
        return NextResponse.json({ ok: true });
      }

      const result = await holdDraftAtomic(draftId, "slack");
      if (!result.ok) {
        await respondViaResponseUrl(payload.response_url, {
          response_type: "ephemeral",
          text: `Couldn't hold (${result.reason}).`,
        });
        return NextResponse.json({ ok: true });
      }

      // B-1: emit manual-held event for cancelOn consumers
      await inngest.send({ name: "draft/held_manually", data: { draftId, coachId } });

      await respondViaResponseUrl(payload.response_url, {
        replace_original: true,
        blocks: buildHeldBlocks(),
      });
      return NextResponse.json({ ok: true });
    }

    if (action.action_id === "draft_edit") {
      const { data: draft } = await adminClient
        .from("drafts")
        .select("subject, body, coach_id")
        .eq("id", draftId)
        .single();
      if (!draft || draft.coach_id !== coachId) {
        return NextResponse.json({ ok: false }, { status: 200 });
      }

      try {
        const slack = await getSlackClientForCoach(coachId);
        await slack.views.open({
          trigger_id: payload.trigger_id,
          view: buildEditModalView({
            draftId,
            currentSubject: (draft.subject as string) ?? "",
            currentBody: (draft.body as string) ?? "",
          }) as never,
        });
      } catch {
        // views.open failure is non-fatal, 3s budget already preserved
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, reason: "unknown_action" }, { status: 200 });
  }

  // ---- view_submission: Edit modal "Save and send" ----
  if (payload.type === "view_submission" && payload.view.callback_id === "draft_edit_submit") {
    const draftId = payload.view.private_metadata;
    const subject =
      payload.view.state.values?.draft_subject_input?.value?.value ?? "";
    const body =
      payload.view.state.values?.draft_body_input?.value?.value ?? "";

    const lookup = await findCoachIdByTeam(payload.user.team_id);
    if (!lookup.ok) {
      const message =
        lookup.reason === "multi_coach"
          ? "This workspace has multiple coaches, please reinstall Sonorous for your account."
          : "Could not find your coach account.";
      return NextResponse.json({
        response_action: "errors",
        errors: { draft_body_input: message },
      });
    }
    const coachId = lookup.coachId;

    const { data: prev } = await adminClient
      .from("drafts")
      .select("subject, body, lead_id, sequence_id, coach_id")
      .eq("id", draftId)
      .single();
    if (!prev || prev.coach_id !== coachId) {
      return NextResponse.json({ response_action: "clear" });
    }

    // Record edit in draft_edits (original_body/edited_body per schema)
    await adminClient.from("draft_edits").insert({
      coach_id: prev.coach_id as string,
      draft_id: draftId,
      original_body: prev.body as string,
      edited_body: body,
    });

    // Update draft with edited content
    await adminClient.from("drafts").update({ subject, body }).eq("id", draftId);

    const blocked = await runPreSendSafetyCheck(
      prev.lead_id as string,
      prev.sequence_id as string | null,
    );
    if (blocked) {
      return NextResponse.json({
        response_action: "errors",
        errors: { draft_body_input: `Couldn't send (${blocked}).` },
      });
    }

    const result = await approveDraftAtomic(draftId, "slack");
    if (!result.ok) {
      return NextResponse.json({
        response_action: "errors",
        errors: { draft_body_input: "This draft was already approved." },
      });
    }

    // B-1: emit approved + send events (Edit modal path)
    await inngest.send({ name: "draft/approved_manually", data: { draftId, coachId } });
    await inngest.send({
      name: "draft/send_via_gmail",
      data: { draftId, coachId, source: "slack_edit" },
    });

    // Update original DM via last notification_log row for this coach+slack channel
    const { data: log } = await adminClient
      .from("notification_log")
      .select("external_id")
      .eq("coach_id", coachId)
      .eq("channel", "slack")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (log?.external_id) {
      try {
        const slack = await getSlackClientForCoach(coachId);
        const { data: intRow } = await adminClient
          .from("integrations")
          .select("external_account_id")
          .eq("coach_id", coachId)
          .eq("provider", "slack")
          .single();
        if (intRow?.external_account_id) {
          await slack.chat.update({
            channel: intRow.external_account_id as string,
            ts: log.external_id,
            blocks: buildEditedApprovedBlocks(formatTime(new Date())) as never[],
            text: "Edited and approved",
          });
        }
      } catch {
        // DM update failure is non-fatal
      }
    }

    return NextResponse.json({ response_action: "clear" });
  }

  return NextResponse.json({ ok: true });
}
