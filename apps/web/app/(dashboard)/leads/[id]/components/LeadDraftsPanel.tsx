"use client";
import { AnimatePresence } from "framer-motion";
import { DraftCard } from "@/components/drafts/DraftCard";
import { useDraftRealtime } from "@/components/drafts/draft-realtime";
import type { Database } from "@client/database";

type DraftRow = Database["public"]["Tables"]["drafts"]["Row"] & {
  leads: { name: string } | null;
};

interface Props {
  coachId: string;
  leadId: string;
  leadName: string;
  initialPending: DraftRow[];
  initialHeld: DraftRow[];
  /** Coach's IANA timezone — renders draft send times in their local clock. */
  timeZone?: string | null;
}

/**
 * Approve / hold surface for ad-hoc (standalone, sequence_id=null) drafts that
 * a coach generates straight from the lead profile — #41. Mirrors the dashboard
 * queue's affordances via the shared DraftCard, scoped to this one lead through
 * the realtime hook's leadId filter. Skip is hidden: there is no "next" here.
 *
 * Realtime keeps the panel live: a freshly generated draft transitions
 * generating -> pending and appears automatically; approving or holding moves
 * the card between the two sections (or out entirely once it sends).
 */
export function LeadDraftsPanel({
  coachId,
  leadId,
  leadName,
  initialPending,
  initialHeld,
  timeZone,
}: Props) {
  const { drafts: pendingRaw, removeDraft: removePending } = useDraftRealtime(coachId, {
    status: "pending",
    leadId,
    initialDrafts: initialPending,
  });
  const { drafts: heldRaw, removeDraft: removeHeld } = useDraftRealtime(coachId, {
    status: "held",
    leadId,
    initialDrafts: initialHeld,
  });

  // Realtime payloads carry the raw drafts row with no joined lead — backfill
  // the name we already know so DraftCard never renders "Unknown lead".
  const withLead = (rows: DraftRow[]) =>
    rows.map((d) => ({ ...d, leads: d.leads ?? { name: leadName } }));
  const pending = withLead(pendingRaw);
  const held = withLead(heldRaw);

  if (pending.length === 0 && held.length === 0) return null;

  return (
    <section data-tour="lead-drafts" className="space-y-3" aria-label="Drafts awaiting review">
      <h2 className="text-sm font-medium text-muted-foreground">
        Drafts awaiting review
      </h2>
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {pending.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              variant="pending"
              showSkip={false}
              timeZone={timeZone}
              onDeleted={() => removePending(draft.id)}
            />
          ))}
          {held.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              variant="held"
              timeZone={timeZone}
              onDeleted={() => removeHeld(draft.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
