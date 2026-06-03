import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { recordCallOutcomeAtomic } from "@/lib/call-outcomes/record-atomic";
import { fireCallOutcomeDownstream } from "@/lib/call-outcomes/downstream";
import { syncSlackCallOutcomeMessage } from "@/lib/slack/sync-call-outcome-message";
import type { TLeadEventType } from "@client/shared";

// D-17: the single resolve path used by every UI (dashboard card, lead-profile
// panel). Three outcomes only (D-18); notes optional in v1 (deferred: required
// note on no-show). Mirrors app/api/drafts/[id]/route.ts.
const BodySchema = z.object({
  outcome: z.enum(["no_show", "completed", "converted"]),
  notes: z.string().max(2000).optional(),
});

// outcome -> timeline lead_event_type (D-07: call_converted added in 07-01).
const OUTCOME_EVENT: Record<
  z.infer<typeof BodySchema>["outcome"],
  TLeadEventType
> = {
  no_show: "no_show",
  completed: "call_completed",
  converted: "call_converted",
};

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

  // Fetch the row up front so ownership is enforced BEFORE any mutation (T-07-13
  // / CALL-009 — no IDOR). adminClient bypasses RLS, so the coach_id check is the
  // only authorization gate here.
  const { data: row } = await adminClient
    .from("call_outcomes")
    .select("id, coach_id, lead_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.coach_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { outcome, notes } = parsed.data;

  // Optional coach note about the call — persist before the atomic flip so it is
  // present once the row is resolved.
  if (notes !== undefined) {
    await adminClient.from("call_outcomes").update({ notes }).eq("id", id);
  }

  // CAS resolve: only succeeds when status='awaiting_outcome'. A duplicate /
  // late resolve (double-click, provider no_show after a manual pick) no-ops and
  // returns 409 — the downstream below never double-fires (T-07-16).
  const result = await recordCallOutcomeAtomic(id, outcome, "dashboard");
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: 409 },
    );
  }

  // Timeline event (renders in the lead activity feed with its own icon).
  await adminClient.from("lead_events").insert({
    coach_id: row.coach_id,
    lead_id: row.lead_id,
    event_type: OUTCOME_EVENT[outcome],
    triggered_by: "coach",
    payload: { source: "dashboard", callOutcomeId: id },
  });

  // Drive the correct downstream track (no_show / completed / converted) — from
  // 07-02; idempotent so even a racing duplicate would be safe (already 409'd).
  await fireCallOutcomeDownstream({
    outcome,
    coachId: row.coach_id,
    leadId: row.lead_id,
    callOutcomeId: id,
  });

  // Retire the Slack prompt buttons (if a prompt was posted) so the coach can't
  // double-act from Slack after resolving on the dashboard.
  await syncSlackCallOutcomeMessage({ id, coachId: row.coach_id, outcome });

  return NextResponse.json({ ok: true, new_status: result.new_status });
}
