import { adminClient } from "@/lib/supabase/admin";
import { PendingActionCard } from "./PendingActionCard";

interface Props {
  coachId: string;
}

export async function PendingActionsSection({ coachId }: Props) {
  const { data: actions } = await adminClient
    .from("pending_actions")
    .select("*")
    .eq("coach_id", coachId)
    .is("dismissed_at", null)
    .order("created_at", { ascending: true });

  if (!actions || actions.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Pending Actions</h2>
      <div className="space-y-3">
        {actions.map((action) => (
          <PendingActionCard key={action.id} action={action} />
        ))}
      </div>
    </section>
  );
}
