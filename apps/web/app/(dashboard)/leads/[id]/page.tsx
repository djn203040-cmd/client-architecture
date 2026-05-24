import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { LeadProfileHeader } from "./lead-profile-header";
import { ActivityTimeline } from "./activity-timeline";
import { CoachNotesField } from "./coach-notes-field";
import { SequenceStatusPanel } from "./sequence-status-panel";
import { ManualTranscriptUpload } from "./components/ManualTranscriptUpload";
import { LeadAISummaryCard } from "./components/LeadAISummaryCard";
import { GenerateDraftButton } from "./components/GenerateDraftButton";
import { EmailThreadView } from "./components/EmailThreadView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { TLeadStatus } from "@client/shared/types";

export default async function LeadProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) notFound();

  const [eventsResult, transcriptsResult] = await Promise.all([
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
  ]);

  const allTranscripts = transcriptsResult.data ?? [];
  const latestTranscript = allTranscripts[0] ?? null;
  const priorTranscripts = allTranscripts.slice(1);

  return (
    <article className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
      <div className="space-y-6">
        <LeadProfileHeader lead={lead} />
        <LeadAISummaryCard lead={lead} />
        <div className="flex justify-end">
          <GenerateDraftButton leadId={lead.id} leadStatus={lead.status as TLeadStatus} />
        </div>
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
        <SequenceStatusPanel leadId={lead.id} status={lead.status} />
        <ManualTranscriptUpload
          leadId={lead.id}
          latestTranscript={latestTranscript}
          priorTranscripts={priorTranscripts}
        />
      </aside>
    </article>
  );
}
