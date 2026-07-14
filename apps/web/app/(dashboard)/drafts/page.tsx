import { createClient } from "@/lib/supabase/server";
import { decryptTranscript } from "@/lib/crypto/transcript-cipher";
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
      // Queue scope (revised, supersedes #41): the queue shows ALL pending
      // drafts — scheduled sequence work first (by send time), then ad-hoc
      // drafts (sequence_id=null, no scheduled_send_at → NULLS LAST). Ad-hoc
      // drafts also remain on their lead's page (LeadDraftsPanel); realtime
      // keeps both surfaces in sync when one of them acts on a draft.
      .order("scheduled_send_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
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
        initialUnmatched={(unmatchedResult.data ?? []).map((tr) => ({
          ...tr,
          content: decryptTranscript(tr.content) ?? "",
        }))}
        leads={leadsResult.data ?? []}
        timeZone={coachResult.data?.timezone}
      />
    </section>
  );
}
