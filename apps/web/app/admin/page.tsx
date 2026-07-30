import Link from "next/link";
import { fetchCoachRoster, fetchFeedback, fetchSystemHealth } from "./admin-data";
import { fetchStuckSends } from "@/lib/admin/stuck-sends";
import { CoachRosterTable } from "@/components/admin/CoachRosterTable";
import { SystemHealthPanel } from "@/components/admin/SystemHealthPanel";
import { StuckSendsPanel } from "@/components/admin/StuckSendsPanel";
import { CreateCoachSheet } from "@/components/admin/CreateCoachSheet";
import { FeedbackPanel } from "@/components/admin/FeedbackPanel";
import { Warning } from "@phosphor-icons/react/dist/ssr";

export default async function AdminPage() {
  const [coaches, feedback, health, stuckSends] = await Promise.all([
    fetchCoachRoster(),
    fetchFeedback(),
    fetchSystemHealth(),
    fetchStuckSends(),
  ]);

  // Only the unwitnessed ones are actionable; witnessed stuck sends self-heal on
  // the next reconciler tick and don't warrant pulling Daniel out of what he's doing.
  const needsOperator = stuckSends.filter((s) => !s.witnessed).length;

  return (
    <section className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold leading-[1.2]">Coaches</h1>
        <CreateCoachSheet />
      </header>

      {needsOperator > 0 && (
        <Link
          href="#system-health"
          className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 min-h-[44px] py-3 text-sm text-amber-700 dark:text-amber-400 hover:bg-amber-500/15 transition-colors"
        >
          <Warning weight="fill" className="size-4 shrink-0" />
          <span>
            {needsOperator} send{needsOperator === 1 ? "" : "s"} stopped mid-flight and need
            {needsOperator === 1 ? "s" : ""} you to decide whether the email went out.
          </span>
        </Link>
      )}

      <CoachRosterTable rows={coaches} />

      <section id="feedback" className="space-y-4">
        <h2 className="text-xl font-semibold">Coach feedback</h2>
        <FeedbackPanel rows={feedback} />
      </section>

      <section id="system-health" className="space-y-4">
        <h2 className="text-xl font-semibold">System health</h2>
        <StuckSendsPanel rows={stuckSends} />
        <SystemHealthPanel health={health} />
      </section>
    </section>
  );
}
