import { createClient } from "@/lib/supabase/server";
import { DraftQueueScaffold } from "@/components/drafts/DraftQueueScaffold";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Database } from "@client/database";

type DraftRow = Database["public"]["Tables"]["drafts"]["Row"] & {
  leads: { name: string } | null;
};

export default async function DraftsPage() {
  const supabase = await createClient();
  const t = await getServerDictionary();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [draftsResult, unmatchedResult, leadsResult, coachResult] = await Promise.all([
    supabase
      .from("drafts")
      .select("*, leads(name)")
      .eq("coach_id", user!.id)
      .eq("status", "pending")
      // Queue-scope decision (#41): the queue is for scheduled sequence work
      // only. Standalone drafts (sequence_id=null, generated ad-hoc from a
      // lead profile) are reviewed on that lead's page (LeadDraftsPanel), not
      // here, keep the two surfaces from double-presenting the same card.
      .not("sequence_id", "is", null)
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
    supabase.from("coaches").select("timezone").eq("id", user!.id).maybeSingle(),
  ]);

  return (
    <section className="space-y-6">
      <h1 className="text-[28px] font-semibold leading-[1.2]">{t.drafts.page.title}</h1>
      <DraftQueueScaffold
        coachId={user!.id}
        initialDrafts={(draftsResult.data ?? []) as DraftRow[]}
        initialUnmatched={unmatchedResult.data ?? []}
        leads={leadsResult.data ?? []}
        timeZone={coachResult.data?.timezone}
      />
    </section>
  );
}
