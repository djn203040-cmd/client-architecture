import "server-only";
import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import { CRON_DNC_PURGE } from "@client/shared/constants/events";

type PurgeEvent = { name: string; data: Record<string, never> };

type StepTools = {
  run<T>(id: string, fn: () => Promise<T> | T): Promise<T>;
};

// GDPR Article 5(1)(e) / 17: a lead who has opted out (do_not_contact) must not
// be retained indefinitely. docs/privacy-policy.md promises a 90-day purge; this
// enforces it. The window is measured from `marked_do_not_contact_at` (stamped
// by a DB trigger on opt-out), not from row creation.
const RETENTION_DAYS = 90;

export async function doNotContactPurgeHandler({ step }: { event: PurgeEvent; step: StepTools }) {
  const cutoffIso = await step.run("compute-cutoff", () => {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    return cutoff.toISOString();
  });

  // Delete in one statement; FKs (ON DELETE CASCADE) remove the lead's
  // transcripts, drafts, email_events, lead_events, sequences, calendar_events.
  const purged = await step.run("purge-expired-dnc-leads", async () => {
    const { data, error } = await adminClient
      .from("leads")
      .delete()
      .eq("do_not_contact", true)
      .lt("marked_do_not_contact_at", cutoffIso)
      .select("id, coach_id");
    if (error) throw new Error(`dnc_purge failed: ${error.message}`);
    return data ?? [];
  });

  // Record the purge per affected coach for accountability (Article 30).
  if (purged.length > 0) {
    await step.run("audit-purge", async () => {
      const byCoach = new Map<string, number>();
      for (const row of purged) {
        byCoach.set(row.coach_id, (byCoach.get(row.coach_id) ?? 0) + 1);
      }
      const rows = [...byCoach.entries()].map(([coach_id, count]) => ({
        coach_id,
        action: "gdpr_retention_purge" as const,
        metadata: { purged_leads: count, retention_days: RETENTION_DAYS },
      }));
      const { error } = await adminClient.from("audit_log").insert(rows);
      if (error) throw new Error(`dnc_purge audit failed: ${error.message}`);
    });
  }

  return { purged: purged.length, cutoff: cutoffIso };
}

export const doNotContactPurge = inngest.createFunction(
  {
    id: "do-not-contact-purge",
    name: "GDPR retention: purge leads do_not_contact for >90 days",
    // Inngest-native cron is the live cadence (Vercel Hobby caps vercel.json at
    // two daily crons, both taken). The event trigger is a manual fast-path via
    // /api/cron/dnc-purge. Daily at 03:15 UTC, off-peak.
    triggers: [{ cron: "15 3 * * *" }, { event: CRON_DNC_PURGE }],
    retries: 2,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason: Inngest handler signature widened for event payload
  doNotContactPurgeHandler as any,
);
