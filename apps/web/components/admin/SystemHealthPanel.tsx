import type { SystemHealth } from "@/app/admin/admin-data";

export function SystemHealthPanel({ health }: { health: SystemHealth }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-2xl bg-card dark:bg-white/5 border border-border dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-6">
        <h3 className="text-sm text-muted-foreground mb-4">Inngest queue</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Queue depth</span>
            <span className="font-mono">{health.inngest.queue_depth ?? "-"}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-card dark:bg-white/5 border border-border dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-6">
        <h3 className="text-sm text-muted-foreground mb-4">Cron</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Last run</span>
            <span className="font-mono">{health.cron.last_run_at ?? "-"}</span>
          </div>
        </div>
      </div>

      <div className="md:col-span-2 rounded-2xl bg-card dark:bg-white/5 border border-border dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-6">
        <h3 className="text-sm text-muted-foreground mb-4">Gmail watch status (per coach)</h3>
        <table className="w-full text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2 text-left font-normal">Coach</th>
              <th scope="col" className="px-4 py-2 text-left font-normal">Status</th>
              <th scope="col" className="px-4 py-2 text-left font-normal">Watch expires</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {health.coaches.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-3 text-center text-muted-foreground">
                  No coaches yet
                </td>
              </tr>
            )}
            {health.coaches.map((c) => (
              <tr key={c.id} className="min-h-[44px]">
                <td className="px-4 py-2">
                  <div>{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.email}</div>
                </td>
                <td className="px-4 py-2 font-mono">{c.gmail_status}</td>
                <td className="px-4 py-2 font-mono text-muted-foreground">
                  {c.watch_expiry_at ? new Date(c.watch_expiry_at).toLocaleString() : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
