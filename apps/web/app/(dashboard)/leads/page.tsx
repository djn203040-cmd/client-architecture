import { createClient } from "@/lib/supabase/server";
import { LeadsTable } from "./leads-table";
import { LeadListControls } from "./lead-list-controls";
import { AddLeadSheet } from "./add-lead-sheet";

type Search = { tab?: string; q?: string; status?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const tab = sp.tab ?? "active";
  const q = sp.q ?? "";

  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select("*")
    .or("external_ids->>demo.is.null,external_ids->>demo.neq.true")
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (tab === "active") {
    query = query.in("status", ["identified", "call_booked", "no_show", "call_completed", "in_sequence"]);
  } else if (tab === "replied") {
    query = query.eq("status", "replied");
  } else if (tab === "won") {
    query = query.eq("status", "converted");
  } else if (tab === "held") {
    query = query.eq("status", "do_not_contact");
  } else if (tab === "closed") {
    query = query.in("status", ["closed", "unsubscribed", "bounced"]);
  }

  if (q) query = query.ilike("name", `%${q}%`);
  if (sp.status) query = query.eq("status", sp.status);

  const { data: leads = [] } = await query;

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold leading-[1.2]">Leads</h1>
        <AddLeadSheet />
      </header>
      <LeadListControls activeTab={tab} q={q} />
      <LeadsTable leads={leads ?? []} emptyVariant={q || sp.status ? "filtered" : "no-leads"} />
    </section>
  );
}
