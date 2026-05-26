import { createClient } from "@/lib/supabase/server";
import { DraftQueueScaffold } from "@/components/drafts/DraftQueueScaffold";
import type { Database } from "@client/database";

type DraftRow = Database["public"]["Tables"]["drafts"]["Row"] & {
  leads: { name: string } | null;
};

export default async function DraftsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [draftsResult, unmatchedResult, leadsResult] = await Promise.all([
    supabase
      .from("drafts")
      .select("*, leads(name)")
      .eq("coach_id", user!.id)
      .eq("status", "pending")
      // Standalone drafts (sequence_id=null, generated via the lead profile)
      // are surfaced here too. The PATCH route still rejects approve/hold for
      // them with a legible "not part of an active sequence yet" toast; full
      // standalone approval is tracked in #41.
      .order("scheduled_send_at", { ascending: true }),
    supabase
      .from("transcripts")
      .select("*")
      .eq("coach_id", user!.id)
      .is("lead_id", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("leads")
      .select("id, name, email")
      .eq("coach_id", user!.id)
      .order("name", { ascending: true }),
  ]);

  return (
    <section className="space-y-6">
      <h1 className="text-[28px] font-semibold leading-[1.2]">Drafts</h1>
      <DraftQueueScaffold
        coachId={user!.id}
        initialDrafts={(draftsResult.data ?? []) as DraftRow[]}
        initialUnmatched={unmatchedResult.data ?? []}
        leads={leadsResult.data ?? []}
      />
    </section>
  );
}
