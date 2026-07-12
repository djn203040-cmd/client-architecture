"use client";
import { useState, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { DraftCard } from "./DraftCard";
import { HeldTab } from "./HeldTab";
import { CelebrationEmptyState } from "./CelebrationEmptyState";
import { UnmatchedTranscriptQueue } from "./UnmatchedTranscriptQueue";
import { useDraftRealtime } from "./draft-realtime";
import { useDictionary } from "@/lib/i18n/provider";
import type { Database } from "@client/database";

type DraftRow = Database["public"]["Tables"]["drafts"]["Row"] & {
  leads: { name: string } | null;
};
type TranscriptRow = Database["public"]["Tables"]["transcripts"]["Row"];
type LeadRow = Pick<Database["public"]["Tables"]["leads"]["Row"], "id" | "name" | "email">;

type Tab = "drafts" | "held" | "unmatched";

export function DraftQueueScaffold({
  coachId,
  initialDrafts,
  initialUnmatched = [],
  leads = [],
  timeZone,
}: {
  coachId: string;
  initialDrafts: DraftRow[];
  initialUnmatched?: TranscriptRow[];
  leads?: LeadRow[];
  /** Coach's IANA timezone, renders draft send times in their local clock. */
  timeZone?: string | null;
}) {
  const t = useDictionary();
  const [activeTab, setActiveTab] = useState<Tab>("drafts");
  const [justEmptied, setJustEmptied] = useState(false);
  const prevLengthRef = useRef(initialDrafts.length);

  // Queue-scope decision (#41): this queue is for scheduled sequence work
  // only, standalone drafts (sequence_id=null) are reviewed on their lead's
  // profile page. sequenceOnly keeps realtime consistent with the server query.
  const { drafts, loading: draftsLoading, rotateCurrent, removeDraft } = useDraftRealtime(coachId, {
    status: "pending",
    initialDrafts,
    sequenceOnly: true,
  });
  const { drafts: heldDrafts } = useDraftRealtime(coachId, {
    status: "held",
    sequenceOnly: true,
  });

  // Detect when queue drains via a coach action (not initial empty load)
  const prevLength = prevLengthRef.current;
  if (prevLength > 0 && drafts.length === 0 && !justEmptied) {
    setJustEmptied(true);
  }
  if (drafts.length > 0 && justEmptied) {
    setJustEmptied(false);
  }
  prevLengthRef.current = drafts.length;

  // Called after Approve/Hold, realtime removes the draft from the bucket
  // automatically, so the queue advances on its own. Skip uses rotateCurrent
  // (client-side rotation) instead since the draft's status doesn't change.
  const advance = useCallback(() => {
    // No-op: realtime drives the queue update.
  }, []);

  const unmatchedCount = initialUnmatched.length;
  const heldCount = heldDrafts.length;

  return (
    <div data-tour="drafts-queue" className="space-y-4">
      <div
        role="tablist"
        aria-label={t.drafts.queue.tablistLabel}
        className="flex items-center gap-1 border-b border-border pb-3"
      >
        <TabButton
          id="tab-drafts"
          controls="tabpanel-drafts"
          active={activeTab === "drafts"}
          onClick={() => setActiveTab("drafts")}
          badge={drafts.length > 0 ? drafts.length : undefined}
        >
          {t.drafts.queue.tabPending}
        </TabButton>
        <TabButton
          id="tab-held"
          controls="tabpanel-held"
          active={activeTab === "held"}
          onClick={() => setActiveTab("held")}
          badge={heldCount > 0 ? heldCount : undefined}
        >
          {t.drafts.queue.tabHeld}
        </TabButton>
        <TabButton
          id="tab-unmatched"
          controls="tabpanel-unmatched"
          active={activeTab === "unmatched"}
          onClick={() => setActiveTab("unmatched")}
          badge={unmatchedCount > 0 ? unmatchedCount : undefined}
        >
          {t.drafts.queue.tabUnmatched}
        </TabButton>
      </div>

      <div
        role="tabpanel"
        id="tabpanel-drafts"
        aria-labelledby="tab-drafts"
        tabIndex={0}
        hidden={activeTab !== "drafts"}
      >
        {!draftsLoading && justEmptied ? (
          <CelebrationEmptyState />
        ) : drafts.length === 0 ? (
          <div className="rounded-2xl backdrop-blur-md bg-card dark:bg-white/5 border border-border dark:border-white/10 p-16 text-center">
            <h2 className="text-xl font-semibold mb-2">{t.drafts.queue.emptyTitle}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t.drafts.queue.emptyBody}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4" aria-live="polite">
              {t.drafts.queue.waiting(drafts.length)}
            </p>
            <AnimatePresence mode="wait">
              <DraftCard
                key={drafts[0]!.id}
                draft={drafts[0]!}
                onAdvance={drafts.length > 1 ? rotateCurrent : advance}
                onDeleted={() => removeDraft(drafts[0]!.id)}
                timeZone={timeZone}
              />
            </AnimatePresence>
          </>
        )}
      </div>

      <div
        role="tabpanel"
        id="tabpanel-held"
        aria-labelledby="tab-held"
        tabIndex={0}
        hidden={activeTab !== "held"}
      >
        {activeTab === "held" && <HeldTab coachId={coachId} timeZone={timeZone} />}
      </div>

      <div
        role="tabpanel"
        id="tabpanel-unmatched"
        aria-labelledby="tab-unmatched"
        tabIndex={0}
        hidden={activeTab !== "unmatched"}
      >
        <UnmatchedTranscriptQueue
          coachId={coachId}
          initialTranscripts={initialUnmatched}
          leads={leads}
        />
      </div>
    </div>
  );
}

function TabButton({
  id,
  controls,
  active,
  onClick,
  badge,
  children,
}: {
  id: string;
  controls: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors min-h-[44px] ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
      }`}
    >
      {children}
      {badge !== undefined && (
        <span className="ml-2 rounded-full text-xs font-mono px-1.5 py-0.5 bg-muted text-muted-foreground">
          {badge}
        </span>
      )}
    </button>
  );
}
