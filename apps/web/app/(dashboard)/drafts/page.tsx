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
  const { data: drafts } = await supabase
    .from("drafts")
    .select("*, leads(name)")
    .eq("coach_id", user!.id)
    .eq("status", "pending")
    .order("scheduled_send_at", { ascending: true });

  return (
    <section className="space-y-6">
      <h1 className="text-[28px] font-semibold leading-[1.2]">Drafts</h1>
      <DraftQueueScaffold
        coachId={user!.id}
        initialDrafts={(drafts ?? []) as DraftRow[]}
      />
    </section>
  );
}
