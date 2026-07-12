"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Lifts the sticky do_not_contact flag and returns the lead to 'identified'
// so the coach can re-engage. Logs an event for the timeline. Only invoked
// from a confirmation dialog, coaches should rarely use this.
export async function liftDoNotContact(leadId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: existing } = await supabase
    .from("leads")
    .select("status, do_not_contact")
    .eq("id", leadId)
    .maybeSingle();
  if (!existing) throw new Error("Not found");

  await supabase
    .from("leads")
    .update({ do_not_contact: false, status: "identified" })
    .eq("id", leadId);

  await supabase.from("lead_events").insert({
    lead_id: leadId,
    coach_id: user.id,
    event_type: "state_changed",
    payload: { from: existing.status, to: "identified", lifted_do_not_contact: true },
    triggered_by: "coach",
  });

  revalidatePath(`/leads/${leadId}`);
}
