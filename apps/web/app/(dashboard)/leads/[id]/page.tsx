import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { LeadProfileHeader } from "./lead-profile-header";
import { ActivityTimeline } from "./activity-timeline";
import { CoachNotesField } from "./coach-notes-field";
import { SequenceStatusPanel } from "./sequence-status-panel";
import { ManualTranscriptUpload } from "./components/ManualTranscriptUpload";
import { LeadAISummaryCard } from "./components/LeadAISummaryCard";
import { GenerateDraftButton } from "./components/GenerateDraftButton";
import { LeadDraftsPanel } from "./components/LeadDraftsPanel";
import { LeadCallOutcomePanel } from "@/components/leads/LeadCallOutcomePanel";
import { EmailThreadView } from "./components/EmailThreadView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { TLeadStatus } from "@client/shared/types";
import type { CallOutcomeRow } from "@/components/calls/call-outcome-realtime";
import { buildSequenceView, type TSequenceConfig } from "@/lib/sequences/progress";

export default async function LeadProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) notFound();

  const [
    eventsResult,
    transcriptsResult,
    draftsResult,
    sequenceResult,
    coachResult,
    sequenceDraftsResult,
    awaitingCallsResult,
  ] = await Promise.all([
      supabase
        .from("lead_events")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("transcripts")
        .select("id, content, created_at")
        .eq("lead_id", id)
        .order("created_at", { ascending: false }),
      // Reviewable drafts for this lead — surfaces ad-hoc standalone drafts that
      // never enter the dashboard queue's sequence flow (#41).
      supabase
        .from("drafts")
        .select("*, leads(name)")
        .eq("lead_id", id)
        .in("status", ["pending", "held"])
        .order("created_at", { ascending: false }),
      // Most recent sequence for this lead — drives the follow-along stepper.
      supabase
        .from("sequences")
        .select("id, track, status, created_at")
        .eq("lead_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Coach cadence config + timezone — cadence defines how many touchpoints
      // and their timing; timezone renders send times in the coach's local clock.
      supabase
        .from("coaches")
        .select("sequence_config, timezone")
        .eq("id", lead.coach_id)
        .maybeSingle(),
      // Sequence-linked drafts — let the stepper reflect real send progress.
      supabase
        .from("drafts")
        .select("sequence_id, touchpoint_index, status, sent_at, scheduled_send_at")
        .eq("lead_id", id)
        .not("sequence_id", "is", null),
      // Calls awaiting an outcome for this lead — surfaced inline with the
      // three outcome buttons (D-20). RLS scopes the read to the coach.
      supabase
        .from("call_outcomes")
        .select("*, leads(name)")
        .eq("lead_id", id)
        .eq("status", "awaiting_outcome")
        .order("ends_at", { ascending: true }),
    ]);

  const allTranscripts = transcriptsResult.data ?? [];
  const latestTranscript = allTranscripts[0] ?? null;
  const priorTranscripts = allTranscripts.slice(1);

  const allDrafts = draftsResult.data ?? [];
  const pendingDrafts = allDrafts.filter((d) => d.status === "pending");
  const heldDrafts = allDrafts.filter((d) => d.status === "held");

  // Build the follow-along stepper for an in-progress sequence. Cancelled
  // sequences ended early, so we don't show a partial timeline for them.
  const sequenceRow = sequenceResult.data;
  const sequenceDrafts = (sequenceDraftsResult.data ?? []).filter(
    (d) => d.sequence_id === sequenceRow?.id
  );
  const sequenceView =
    sequenceRow && sequenceRow.status !== "cancelled"
      ? buildSequenceView(
          sequenceRow,
          (coachResult.data?.sequence_config as TSequenceConfig) ?? null,
          { drafts: sequenceDrafts, timeZone: coachResult.data?.timezone }
        )
      : null;

  return (
    <div className="space-y-4">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to leads
      </Link>
      <article className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
      <div className="space-y-6">
        <LeadProfileHeader lead={lead} />
        <LeadAISummaryCard lead={lead} />
        <div className="flex justify-end">
          <GenerateDraftButton leadId={lead.id} leadStatus={lead.status as TLeadStatus} />
        </div>
        {user && (
          <LeadCallOutcomePanel
            coachId={user.id}
            leadId={lead.id}
            leadName={lead.name}
            leadStatus={lead.status as TLeadStatus}
            initialAwaiting={(awaitingCallsResult.data ?? []) as CallOutcomeRow[]}
            timeZone={coachResult.data?.timezone}
          />
        )}
        {user && (
          <LeadDraftsPanel
            coachId={user.id}
            leadId={lead.id}
            leadName={lead.name}
            initialPending={pendingDrafts}
            initialHeld={heldDrafts}
            timeZone={coachResult.data?.timezone}
          />
        )}
        <Tabs defaultValue="thread">
          <TabsList>
            <TabsTrigger value="thread">Thread</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="thread" className="mt-4">
            <section className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <EmailThreadView leadId={lead.id} />
            </section>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <section className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <ActivityTimeline events={eventsResult.data ?? []} />
            </section>
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <CoachNotesField leadId={lead.id} initialNotes={lead.coach_notes ?? ""} />
          </TabsContent>
        </Tabs>
      </div>
      <aside className="space-y-6">
        <SequenceStatusPanel leadId={lead.id} status={lead.status} sequence={sequenceView} />
        <ManualTranscriptUpload
          leadId={lead.id}
          latestTranscript={latestTranscript}
          priorTranscripts={priorTranscripts}
        />
      </aside>
      </article>
    </div>
  );
}
