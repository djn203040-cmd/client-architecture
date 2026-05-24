import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PendingActionsSection } from "@/components/dashboard/PendingActionsSection";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ count: leadCount }, { count: draftCount }, { count: pendingCount }] = await Promise.all([
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", user!.id)
      .or("external_ids->>demo.is.null,external_ids->>demo.neq.true"),
    supabase
      .from("drafts")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", user!.id)
      .eq("status", "pending"),
    supabase
      .from("pending_actions")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", user!.id)
      .is("dismissed_at", null),
  ]);

  return (
    <section className="space-y-6">
      <h1 className="text-[28px] font-semibold leading-[1.2]">Dashboard</h1>
      {(pendingCount ?? 0) > 0 && (
        <PendingActionsSection coachId={user!.id} />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Primary metric — leads pipeline */}
        <div className="rounded-2xl backdrop-blur-md bg-accent/5 dark:bg-accent/10 border border-accent/20 p-6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="text-sm text-muted-foreground">Leads</div>
          <div className="text-[32px] font-semibold mt-2 font-mono text-accent">{leadCount ?? 0}</div>
          <Link
            href="/leads"
            className="text-sm text-accent hover:underline mt-4 inline-block"
          >
            View leads
          </Link>
        </div>
        {/* Secondary metric — drafts action queue */}
        <div className="rounded-2xl backdrop-blur-md bg-card dark:bg-white/5 border border-border dark:border-white/10 p-6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="text-sm text-muted-foreground">Drafts pending review</div>
          <div className="text-[28px] font-semibold mt-2 font-mono">{draftCount ?? 0}</div>
          {(draftCount ?? 0) > 0 ? (
            <Link
              href="/drafts"
              className="text-sm text-accent hover:underline mt-4 inline-block"
            >
              Review drafts
            </Link>
          ) : (
            <p className="text-xs text-muted-foreground mt-4">
              Drafts appear 24 hours before they&apos;re scheduled to send.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
