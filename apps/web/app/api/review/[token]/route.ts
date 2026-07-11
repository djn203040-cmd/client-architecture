import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { verifyReviewToken } from "@/lib/review-token";
import {
  consumeReviewToken,
  approveDraftAtomic,
  holdDraftAtomic,
} from "@/lib/drafts/approve-atomic";
import { adminClient } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";
import { runPreSendSafetyCheck } from "@/inngest/functions/sequence-step";
import { reviewTokenLimiter, enforce, ipFromRequest } from "@/lib/security/ratelimit";
import { syncSlackDraftMessage } from "@/lib/slack/sync-draft-message";

const BodySchema = z.object({
  status: z.enum(["approved", "held"]),
  body: z.string().optional(),
});

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // Brute-force guard (5 attempts / 5 min / token-prefix + IP).
  const tokenPrefix = token.slice(0, 16);
  const rl = await enforce(
    reviewTokenLimiter,
    `${tokenPrefix}:${ipFromRequest(req)}`,
  );
  if (!rl.success) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": "300" } },
    );
  }

  const payload = verifyReviewToken(token);
  if (!payload) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { status, body } = parsed.data;

  // Apply body edit BEFORE consuming nonce, edits are coach-trusted
  if (body !== undefined) {
    const { data: draft } = await adminClient
      .from("drafts")
      .select("body")
      .eq("id", payload.draftId)
      .single();
    if (draft) {
      await adminClient.from("draft_edits").insert({
        coach_id: payload.coachId,
        draft_id: payload.draftId,
        original_body: draft.body as string,
        edited_body: body,
      });
      await adminClient
        .from("drafts")
        .update({ body })
        .eq("id", payload.draftId);
    }
  }

  // Consume the nonce atomically (also acquires the advisory lock)
  const consume = await consumeReviewToken({
    tokenId: payload.nonce,
    coachId: payload.coachId,
    draftId: payload.draftId,
    action: status === "approved" ? "approve" : "hold",
  });

  if (!consume.ok) {
    const httpStatus =
      consume.reason === "already_consumed" ||
      consume.reason === "nonce_mismatch"
        ? 410
        : 409;
    return NextResponse.json(
      { ok: false, reason: consume.reason },
      { status: httpStatus },
    );
  }

  // Run the status transition
  if (status === "approved") {
    const { data: draft } = await adminClient
      .from("drafts")
      .select("lead_id, sequence_id")
      .eq("id", payload.draftId)
      .single();

    const blocked = draft
      ? await runPreSendSafetyCheck(
          draft.lead_id,
          draft.sequence_id ?? undefined,
        )
      : "draft_missing";

    if (blocked) {
      return NextResponse.json(
        { ok: false, reason: blocked },
        { status: 409 },
      );
    }

    const result = await approveDraftAtomic(payload.draftId, "review_link");
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, reason: result.reason },
        { status: 409 },
      );
    }

    // B-1: emit manual-approved event so any sleeping Inngest timer cancels
    await inngest.send({
      name: "draft/approved_manually",
      data: { draftId: payload.draftId, coachId: payload.coachId },
    });
    await inngest.send({
      name: "draft/send_via_gmail",
      data: {
        draftId: payload.draftId,
        coachId: payload.coachId,
        source: "review_link",
      },
    });
    await syncSlackDraftMessage({
      draftId: payload.draftId,
      coachId: payload.coachId,
      state: "approved",
    });

    return NextResponse.json({ ok: true, new_status: result.new_status });
  }

  // status === "held"
  const result = await holdDraftAtomic(payload.draftId, "review_link");
  if (result.ok) {
    // B-1: emit manual-held event for cancelOn consumers
    await inngest.send({
      name: "draft/held_manually",
      data: { draftId: payload.draftId, coachId: payload.coachId },
    });
    await syncSlackDraftMessage({
      draftId: payload.draftId,
      coachId: payload.coachId,
      state: "held",
    });
  }

  return NextResponse.json(
    result.ok
      ? { ok: true, new_status: result.new_status }
      : { ok: false, reason: result.reason },
    { status: result.ok ? 200 : 409 },
  );
}
