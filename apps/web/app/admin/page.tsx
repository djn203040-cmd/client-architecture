import { fetchCoachRoster, fetchSystemHealth } from "./admin-data";
import { CoachRosterTable } from "@/components/admin/CoachRosterTable";
import { SystemHealthPanel } from "@/components/admin/SystemHealthPanel";
import { CreateCoachSheet } from "@/components/admin/CreateCoachSheet";

export default async function AdminPage() {
  const [coaches, health] = await Promise.all([fetchCoachRoster(), fetchSystemHealth()]);

  return (
    <section className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold leading-[1.2]">Coaches</h1>
        <CreateCoachSheet />
      </header>

      <CoachRosterTable rows={coaches} />

      <section id="system-health" className="space-y-4">
        <h2 className="text-xl font-semibold">System health</h2>
        <SystemHealthPanel health={health} />
      </section>
    </section>
  );
}
