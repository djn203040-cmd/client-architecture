import { adminClient } from "@/lib/supabase/admin";
import { getServerDictionary } from "@/lib/i18n/server";
import { PendingActionCard } from "./PendingActionCard";

interface Props {
  coachId: string;
}

export async function PendingActionsSection({ coachId }: Props) {
  const t = await getServerDictionary();
  const { data: items } = await adminClient
    .from("pending_actions")
    .select("id, type, lead_id, payload, created_at")
    .eq("coach_id", coachId)
    .is("dismissed_at", null)
    .order("created_at", { ascending: true });

  if (!items || items.length === 0) return null;

  const leadIds = items.map((i) => i.lead_id).filter(Boolean) as string[];
  const { data: leads } = leadIds.length
    ? await adminClient.from("leads").select("id, name, email").in("id", leadIds)
    : { data: [] };
  const leadMap = Object.fromEntries((leads ?? []).map((l) => [l.id, l]));

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{t.dashboard.pendingActions.heading}</h2>
      <div className="space-y-3">
        {items.map((item) => {
          const lead = item.lead_id ? leadMap[item.lead_id] : null;
          return (
            <PendingActionCard
              key={item.id}
              id={item.id}
              type={item.type as "call_follow_up" | "lead_intake"}
              leadName={lead?.name ?? t.dashboard.pendingActions.unknownLead}
              leadEmail={lead?.email ?? ""}
            />
          );
        })}
      </div>
    </section>
  );
}
