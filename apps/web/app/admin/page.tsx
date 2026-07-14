import { fetchCoachRoster, fetchFeedback, fetchSystemHealth } from "./admin-data";
import { CoachRosterTable } from "@/components/admin/CoachRosterTable";
import { SystemHealthPanel } from "@/components/admin/SystemHealthPanel";
import { CreateCoachSheet } from "@/components/admin/CreateCoachSheet";
import { FeedbackPanel } from "@/components/admin/FeedbackPanel";

export default async function AdminPage() {
  const [coaches, feedback, health] = await Promise.all([
    fetchCoachRoster(),
    fetchFeedback(),
    fetchSystemHealth(),
  ]);

  return (
    <section className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold leading-[1.2]">Coaches</h1>
        <CreateCoachSheet />
      </header>

      <CoachRosterTable rows={coaches} />

      <section id="feedback" className="space-y-4">
        <h2 className="text-xl font-semibold">Coach feedback</h2>
        <FeedbackPanel rows={feedback} />
      </section>

      <section id="system-health" className="space-y-4">
        <h2 className="text-xl font-semibold">System health</h2>
        <SystemHealthPanel health={health} />
      </section>
    </section>
  );
}
