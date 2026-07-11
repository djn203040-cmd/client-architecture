import { createClient } from "@/lib/supabase/server";
import { CallQueueScaffold } from "@/components/calls/CallQueueScaffold";
import type { CallOutcomeRow } from "@/components/calls/call-outcome-realtime";

export default async function CallsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS scopes every read to the coach's own rows (coach_id = auth.uid()).
  // Split by lifecycle status so each tab loads its own bucket (D-19):
  //   Awaiting = awaiting_outcome, Upcoming = scheduled, History = resolved.
  const [awaitingResult, upcomingResult, historyResult, coachResult] =
    await Promise.all([
      supabase
        .from("call_outcomes")
        .select("*, leads(name)")
        .eq("coach_id", user!.id)
        .eq("status", "awaiting_outcome")
        .order("ends_at", { ascending: true }),
      supabase
        .from("call_outcomes")
        .select("*, leads(name)")
        .eq("coach_id", user!.id)
        .eq("status", "scheduled")
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("call_outcomes")
        .select("*, leads(name)")
        .eq("coach_id", user!.id)
        .eq("status", "resolved")
        .order("decided_at", { ascending: false })
        .limit(50),
      supabase.from("coaches").select("timezone").eq("id", user!.id).maybeSingle(),
    ]);

  return (
    <section className="space-y-6">
      <header data-tour="calls-header" className="space-y-1">
        <h1 className="text-[28px] font-semibold leading-[1.2]">
          How did the call go?
        </h1>
        <p className="text-sm text-muted-foreground max-w-[60ch]">
          After every booked call, record the outcome in one tap. Converted leads
          stay fully monitored; only the auto-nurture stops.
        </p>
      </header>
      <CallQueueScaffold
        coachId={user!.id}
        initialAwaiting={(awaitingResult.data ?? []) as CallOutcomeRow[]}
        initialUpcoming={(upcomingResult.data ?? []) as CallOutcomeRow[]}
        initialHistory={(historyResult.data ?? []) as CallOutcomeRow[]}
        timeZone={coachResult.data?.timezone}
      />
    </section>
  );
}
