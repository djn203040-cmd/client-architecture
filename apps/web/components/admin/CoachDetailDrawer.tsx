import Link from "next/link";
import { LeadStateBadge } from "@/components/leads/LeadStateBadge";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import type { Database } from "@client/database";
import type { TLeadStatus } from "@client/shared/types";

type TCoach = Database["public"]["Tables"]["coaches"]["Row"];
type TLead = Database["public"]["Tables"]["leads"]["Row"];
type TIntegration = Database["public"]["Tables"]["integrations"]["Row"];

export function CoachDetailDrawer({
  detail,
}: {
  detail: { coach: TCoach; leads: TLead[]; integrations: TIntegration[] };
}) {
  const { coach, leads, integrations } = detail;

  return (
    <article className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
      >
        <ArrowLeft weight="regular" className="size-4" />
        Back to coaches
      </Link>

      <header className="rounded-2xl bg-card dark:bg-white/5 border border-border dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-6">
        <h1 className="text-[28px] font-semibold leading-[1.2]">{coach.name}</h1>
        <p className="text-sm text-muted-foreground">{coach.email}</p>
        <div className="flex gap-2 mt-3 flex-wrap">
          {integrations.map((i) => (
            <span
              key={i.id}
              className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground"
            >
              {i.provider}:{" "}
              <span className="font-mono">{i.status}</span>
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">Read-only view (admin)</p>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-4">Leads ({leads.length})</h2>
        {leads.length === 0 ? (
          <div className="rounded-2xl bg-card dark:bg-white/5 border border-border dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-12 text-center text-muted-foreground">
            No leads yet for this coach.
          </div>
        ) : (
          <div className="rounded-2xl bg-card dark:bg-white/5 border border-border dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr className="text-left text-sm text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-normal">Name</th>
                  <th scope="col" className="px-4 py-3 font-normal">State</th>
                  <th scope="col" className="px-4 py-3 font-normal">Source</th>
                  <th scope="col" className="px-4 py-3 font-normal">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((l) => (
                  <tr key={l.id} className="min-h-[44px]">
                    <td className="px-4 py-3 font-medium">{l.name}</td>
                    <td className="px-4 py-3">
                      <LeadStateBadge status={l.status as TLeadStatus} />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{l.source}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                      {new Date(l.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </article>
  );
}
