import type { TLead } from "@client/shared/types";
import { LeadStateBadge } from "@/components/leads/LeadStateBadge";
import { ManualStateOverride } from "./manual-state-override";

export function LeadProfileHeader({ lead }: { lead: TLead }) {
  return (
    <header className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold leading-[1.2]">{lead.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lead.email}
            {lead.phone ? ` · ${lead.phone}` : ""}
          </p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <LeadStateBadge status={lead.status} />
            <span className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
              {lead.source}
            </span>
            {lead.do_not_contact && (
              <span className="text-xs px-2 py-1 rounded-md bg-destructive text-destructive-foreground">
                Do not contact
              </span>
            )}
          </div>
        </div>
        <ManualStateOverride
          leadId={lead.id}
          currentStatus={lead.status}
          leadName={lead.name}
        />
      </div>
    </header>
  );
}
