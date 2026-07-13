import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { decryptTranscript } from "@/lib/crypto/transcript-cipher";
import { writeAuditLog } from "@/lib/audit/log";
import { gdprExportLimiter, enforce } from "@/lib/security/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GDPR §3.9, full data export.
 *
 * Returns a JSON archive containing every entity the coach owns. OAuth tokens
 * are NEVER included unwrapped, only the vault reference IDs ship.
 *
 * Rate-limited to 1 export per hour per coach (large response).
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await enforce(gdprExportLimiter, `coach:${user.id}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  const coachId = user.id;

  const [
    coach,
    leads,
    drafts,
    integrations,
    sequences,
    notificationPrefs,
    auditEntries,
    voiceCorpus,
    transcripts,
    leadEvents,
    emailEvents,
    callOutcomes,
    calendarEvents,
  ] = await Promise.all([
    adminClient.from("coaches").select("*").eq("id", coachId).maybeSingle(),
    adminClient.from("leads").select("*").eq("coach_id", coachId),
    adminClient.from("drafts").select("*").eq("coach_id", coachId),
    adminClient
      .from("integrations")
      .select("id, provider, status, scopes, created_at, updated_at, vault_secret_id")
      .eq("coach_id", coachId),
    adminClient.from("sequences").select("*").eq("coach_id", coachId),
    adminClient.from("notification_preferences").select("*").eq("coach_id", coachId),
    adminClient.from("audit_log").select("*").eq("coach_id", coachId),
    adminClient.rpc("get_voice_corpus", { p_coach_id: coachId }).then(
      (r) => r.data,
      () => null,
    ),
    // Article 15/20: a data-subject request routed through the coach must be
    // able to surface the lead's full record, including call transcripts, the
    // engagement/open history, call outcomes, and the lead event timeline.
    adminClient.from("transcripts").select("*").eq("coach_id", coachId),
    adminClient.from("lead_events").select("*").eq("coach_id", coachId),
    adminClient.from("email_events").select("*").eq("coach_id", coachId),
    adminClient.from("call_outcomes").select("*").eq("coach_id", coachId),
    adminClient.from("calendar_events").select("*").eq("coach_id", coachId),
  ]);

  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req.headers.get("user-agent");

  await writeAuditLog(
    {
      coachId,
      action: "gdpr_export",
      metadata: {
        leads_count: leads.data?.length ?? 0,
        drafts_count: drafts.data?.length ?? 0,
        integrations_count: integrations.data?.length ?? 0,
      },
      ipAddress,
      userAgent,
    },
    adminClient,
  );

  const archive = {
    generated_at: new Date().toISOString(),
    coach: coach.data,
    leads: leads.data ?? [],
    drafts: drafts.data ?? [],
    integrations: integrations.data ?? [], // vault_secret_id only, no raw tokens
    sequences: sequences.data ?? [],
    notification_preferences: notificationPrefs.data ?? [],
    voice_corpus: voiceCorpus ?? null,
    audit_log: auditEntries.data ?? [],
    // Decrypt transcript content so the data-subject export is human-readable.
    transcripts: (transcripts.data ?? []).map((t) => ({
      ...t,
      content: decryptTranscript(t.content),
    })),
    lead_events: leadEvents.data ?? [],
    email_events: emailEvents.data ?? [],
    call_outcomes: callOutcomes.data ?? [],
    calendar_events: calendarEvents.data ?? [],
  };

  return new NextResponse(JSON.stringify(archive, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="account-export-${coachId}-${Date.now()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
