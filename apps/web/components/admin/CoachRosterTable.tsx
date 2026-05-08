import Link from "next/link";
import type { CoachRosterRow } from "@/app/admin/admin-data";
import type { Database } from "@client/database";

type IntegrationStatus = Database["public"]["Enums"]["integration_status"];

export function CoachRosterTable({ rows }: { rows: CoachRosterRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl bg-card dark:bg-white/5 border border-border dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-16 text-center">
        <h2 className="text-xl font-semibold mb-2">No coaches yet</h2>
        <p className="text-muted-foreground text-sm">
          Send an invite to add the first coach to the system.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card dark:bg-white/5 border border-border dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden">
      <table className="w-full">
        <thead className="border-b border-border">
          <tr className="text-left text-sm text-muted-foreground">
            <th className="px-4 py-3 font-normal">Name / email</th>
            <th className="px-4 py-3 font-normal">Gmail</th>
            <th className="px-4 py-3 font-normal">Leads</th>
            <th className="px-4 py-3 font-normal">Active sequences</th>
            <th className="px-4 py-3 font-normal">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-black/3 dark:hover:bg-white/5 transition-colors">
              <td className="px-4 py-3">
                <Link
                  href={`/admin/coaches/${c.id}`}
                  className="block min-h-[44px] flex flex-col justify-center"
                >
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.email}</div>
                </Link>
              </td>
              <td className="px-4 py-3">
                <GmailChip status={c.gmail_status} />
              </td>
              <td className="px-4 py-3 font-mono text-sm">{c.lead_count}</td>
              <td className="px-4 py-3 font-mono text-sm">{c.active_sequence_count}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                {new Date(c.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GmailChip({ status }: { status: IntegrationStatus | null }) {
  if (status === "connected") {
    return (
      <span className="text-xs px-2 py-1 rounded-md bg-[oklch(60%_0.14_145)] text-white">
        Connected
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="text-xs px-2 py-1 rounded-md bg-destructive text-destructive-foreground">
        Error
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
      Disconnected
    </span>
  );
}
