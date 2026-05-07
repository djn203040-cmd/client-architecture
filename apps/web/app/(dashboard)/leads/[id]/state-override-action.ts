"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function overrideLeadState(leadId: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: existing } = await supabase
    .from("leads")
    .select("status")
    .eq("id", leadId)
    .maybeSingle();
  if (!existing) throw new Error("Not found");

  const update: Record<string, unknown> = { status };
  if (status === "do_not_contact") update.do_not_contact = true;

  await supabase.from("leads").update(update).eq("id", leadId);

  await supabase.from("lead_events").insert({
    lead_id: leadId,
    coach_id: user.id,
    event_type: "state_changed",
    payload: { from: existing.status, to: status },
    triggered_by: "coach",
  });

  revalidatePath(`/leads/${leadId}`);
}
