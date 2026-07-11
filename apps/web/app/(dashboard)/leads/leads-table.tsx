"use client";
import Link from "next/link";
import type { TLead } from "@client/shared/types";
import { LeadStateBadge } from "@/components/leads/LeadStateBadge";
import { motion } from "framer-motion";

export function LeadsTable({
  leads,
  emptyVariant,
}: {
  leads: TLead[];
  emptyVariant: "no-leads" | "filtered";
}) {
  if (leads.length === 0) {
    return emptyVariant === "no-leads" ? <NoLeadsEmpty /> : <FilteredEmpty />;
  }

  return (
    <div
      data-tour="leads-table"
      className="rounded-2xl backdrop-blur-md bg-card dark:bg-white/5 border border-border dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden"
    >
      <table className="w-full">
        <thead className="border-b border-border">
          <tr className="text-left text-sm text-muted-foreground">
            <th className="px-4 py-3 font-normal">Name</th>
            <th className="px-4 py-3 font-normal">State</th>
            <th className="px-4 py-3 font-normal">Source</th>
            <th className="px-4 py-3 font-normal">Last activity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {leads.map((lead, i) => (
            <motion.tr
              key={lead.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 120, damping: 18 }}
              className="hover:bg-muted/50 dark:hover:bg-white/5 transition-colors min-h-[44px]"
            >
              <td className="px-4 py-3">
                <Link href={`/leads/${lead.id}`} className="block">
                  {lead.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <LeadStateBadge status={lead.status} />
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{lead.source}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground font-mono" suppressHydrationWarning>
                {lead.last_activity_at
                  ? new Date(lead.last_activity_at).toLocaleDateString()
                  : "—"}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NoLeadsEmpty() {
  return (
    <div className="rounded-2xl backdrop-blur-md bg-card dark:bg-white/5 border border-border dark:border-white/10 p-16 text-center">
      <h2 className="text-xl font-semibold mb-2">No leads yet</h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        Add your first lead to get started. They can come from Calendly, Cal.com, or anywhere you
        meet potential clients.
      </p>
    </div>
  );
}

function FilteredEmpty() {
  return (
    <div className="rounded-2xl backdrop-blur-md bg-card dark:bg-white/5 border border-border dark:border-white/10 p-16 text-center">
      <h2 className="text-xl font-semibold mb-2">No leads match this filter</h2>
      <p className="text-muted-foreground">Try a different status or clear your search.</p>
    </div>
  );
}
