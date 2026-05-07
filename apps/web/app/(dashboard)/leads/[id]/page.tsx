import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { LeadProfileHeader } from "./lead-profile-header";
import { ActivityTimeline } from "./activity-timeline";
import { CoachNotesField } from "./coach-notes-field";
import { SequenceStatusPanel } from "./sequence-status-panel";

export default async function LeadProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) notFound();

  const { data: events = [] } = await supabase
    .from("lead_events")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: true });

  return (
    <article className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
      <div className="space-y-6">
        <LeadProfileHeader lead={lead} />
        <section className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <h2 className="text-xl font-semibold mb-4">Activity</h2>
          <ActivityTimeline events={events ?? []} />
        </section>
        <CoachNotesField leadId={lead.id} initialNotes={lead.coach_notes ?? ""} />
      </div>
      <aside className="space-y-6">
        <SequenceStatusPanel leadId={lead.id} status={lead.status} />
      </aside>
    </article>
  );
}
