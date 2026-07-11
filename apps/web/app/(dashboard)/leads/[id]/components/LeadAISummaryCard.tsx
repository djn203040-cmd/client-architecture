import type { TLead } from "@client/shared/types";
import { AISummaryEditor } from "./AISummaryEditor";

export function LeadAISummaryCard({ lead }: { lead: TLead }) {
  return (
    <section
      data-tour="lead-description"
      aria-label="AI lead description"
      className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
    >
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Lead description
      </h2>
      {lead.ai_summary ? (
        <AISummaryEditor
          leadId={lead.id}
          initialSummary={lead.ai_summary}
          protected={lead.ai_summary_protected}
        />
      ) : (
        <p className="text-sm text-muted-foreground italic">
          No lead description yet. Generate a draft to build context.
        </p>
      )}
    </section>
  );
}
