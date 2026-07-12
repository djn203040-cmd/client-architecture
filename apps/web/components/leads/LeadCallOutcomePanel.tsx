"use client";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import { CallOutcomeCard } from "@/components/calls/CallOutcomeCard";
import {
  useCallOutcomeRealtime,
  type CallOutcomeRow,
} from "@/components/calls/call-outcome-realtime";
import type { TLeadStatus } from "@client/shared/types";

interface Props {
  coachId: string;
  leadId: string;
  leadName: string;
  leadStatus: TLeadStatus;
  /** Awaiting-outcome rows for this lead, SSR-loaded. */
  initialAwaiting: CallOutcomeRow[];
  /** Coach's IANA timezone, renders call windows in their local clock. */
  timeZone?: string | null;
}

/**
 * Lead-profile call-outcome surface (D-20). Shows any call awaiting an outcome
 * inline with the three buttons (reusing the dashboard CallOutcomeCard, scoped
 * to this lead via the realtime hook's leadId filter), and, on a converted
 * lead, the quiet Module 2 CTA (D-01). Converted is non-terminal: the lead
 * stays fully monitored, so this is an invitation, not an upsell wall.
 */
export function LeadCallOutcomePanel({
  coachId,
  leadId,
  leadName,
  leadStatus,
  initialAwaiting,
  timeZone,
}: Props) {
  const { outcomes } = useCallOutcomeRealtime(coachId, {
    status: "awaiting_outcome",
    leadId,
    initialOutcomes: initialAwaiting,
  });

  const isConverted = leadStatus === "converted";

  if (outcomes.length === 0 && !isConverted) return null;

  return (
    <section className="space-y-4" aria-label="Call outcome">
      {outcomes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Awaiting your outcome
          </h2>
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {outcomes.map((o) => (
                <CallOutcomeCard
                  key={o.id}
                  outcome={o}
                  leadName={o.leads?.name ?? leadName}
                  variant="awaiting"
                  timeZone={timeZone}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {isConverted && <ConvertedModuleCTA />}
    </section>
  );
}

/**
 * Quiet Module 2 ("The Threshold Experience") CTA shown on converted leads.
 * Exact copy from CLAUDE.md. Presentational only, the lead stays live and
 * monitored (T-07-21); this never gates contactability.
 */
function ConvertedModuleCTA() {
  return (
    <Link
      href="/modules/threshold"
      className="group block rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:bg-white/15 dark:hover:bg-white/8"
    >
      <p className="text-base leading-[1.55]">
        <span className="font-semibold">The Threshold Experience</span>
        {", your client's first 48 hours, built from your sales call."}
      </p>
      <span className="mt-3 inline-flex items-center gap-1.5 text-base font-medium text-[oklch(55%_0.13_80)] dark:text-[oklch(80%_0.14_85)]">
        Book a call
        <ArrowUpRight
          weight="bold"
          className="size-[18px] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </span>
    </Link>
  );
}
