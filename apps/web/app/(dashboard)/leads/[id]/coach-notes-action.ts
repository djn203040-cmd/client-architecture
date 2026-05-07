"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveCoachNotes(leadId: string, notes: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase.from("leads").update({ coach_notes: notes }).eq("id", leadId);
  await supabase.from("lead_events").insert({
    lead_id: leadId,
    coach_id: user.id,
    event_type: "note_added",
    triggered_by: "coach",
  });

  revalidatePath(`/leads/${leadId}`);
}
