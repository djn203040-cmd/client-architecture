import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import {
  approveDraftAtomic,
  holdDraftAtomic,
} from "@/lib/drafts/approve-atomic";
import { inngest } from "@/inngest/client";
import { runPreSendSafetyCheck } from "@/inngest/functions/sequence-step";

const BodySchema = z
  .object({
    status: z.enum(["approved", "held", "cancelled"]).optional(),
    body: z.string().min(1).max(50_000).optional(),
    subject: z.string().min(1).max(500).optional(),
  })
  .refine(
    (v) =>
      v.status !== undefined || v.body !== undefined || v.subject !== undefined,
    { message: "At least one of status, body, subject required" },
  );

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data: draft } = await adminClient
    .from("drafts")
    .select("id, coach_id, lead_id, sequence_id, status, body, subject")
    .eq("id", id)
    .maybeSingle();
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (draft.coach_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { status, body, subject } = parsed.data;

  // Body / subject edits — record to draft_edits (VOICE-006) then update draft
  if (body !== undefined || subject !== undefined) {
    await adminClient.from("draft_edits").insert({
      coach_id: draft.coach_id,
      draft_id: draft.id,
      original_body: draft.body,
      edited_body: body ?? draft.body,
    });
    await adminClient
      .from("drafts")
      .update({
        body: body ?? draft.body,
        ...(subject !== undefined ? { subject } : {}),
      })
      .eq("id", id);
  }

  // Status transitions
  if (status === "approved") {
    // Sequence-driven drafts run the pre-send safety check (terminal lead / DNC /
    // inactive sequence). Standalone drafts (sequence_id=null, generated ad-hoc
    // from the lead profile — #41) have no sequence to gate against; the lead's
    // own hard-block states are already enforced upstream at generation time.
    if (draft.sequence_id) {
      const blocked = await runPreSendSafetyCheck(draft.lead_id, draft.sequence_id);
      if (blocked) {
        return NextResponse.json({ ok: false, reason: blocked }, { status: 409 });
      }
    }
    // CAS pending -> approved. approve_draft_atomic only updates the drafts row,
    // so it tolerates a null sequence_id with no migration change.
    const result = await approveDraftAtomic(id, "dashboard");
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, reason: result.reason },
        { status: 409 },
      );
    }
    // B-1: cancel sleeping Inngest timers (Mode B / follow-up / hold cascade).
    // Only sequence-driven drafts arm those timers — skip the signal for
    // standalone drafts so we don't emit no-op cancellations.
    if (draft.sequence_id) {
      await inngest.send({
        name: "draft/approved_manually",
        data: { draftId: id, coachId: draft.coach_id },
      });
    }
    await inngest.send({
      name: "draft/send_via_gmail",
      data: { draftId: id, coachId: draft.coach_id, source: "dashboard" },
    });
    return NextResponse.json({ ok: true, new_status: result.new_status });
  }

  if (status === "held") {
    const result = await holdDraftAtomic(id, "dashboard");
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, reason: result.reason },
        { status: 409 },
      );
    }
    // B-1: cancel sleeping Inngest timers
    await inngest.send({
      name: "draft/held_manually",
      data: { draftId: id, coachId: draft.coach_id },
    });
    return NextResponse.json({ ok: true, new_status: result.new_status });
  }

  if (status === "cancelled") {
    // Terminal cleanup — no advisory lock needed
    await adminClient.from("drafts").update({ status: "cancelled" }).eq("id", id);
    // B-1: emit cancellation so cancelOn consumers exit cleanly
    await inngest.send({
      name: "draft/cancelled",
      data: { draftId: id, coachId: draft.coach_id },
    });
    return NextResponse.json({ ok: true, new_status: "cancelled" });
  }

  return NextResponse.json({ ok: true }); // body/subject-only edit
}
