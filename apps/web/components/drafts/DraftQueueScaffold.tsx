"use client";
import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { DraftCard } from "./DraftCard";
import { UnmatchedTranscriptQueue } from "./UnmatchedTranscriptQueue";
import { useDraftRealtime } from "./draft-realtime";
import type { Database } from "@client/database";

type DraftRow = Database["public"]["Tables"]["drafts"]["Row"] & {
  leads: { name: string } | null;
};
type TranscriptRow = Database["public"]["Tables"]["transcripts"]["Row"];
type LeadRow = Pick<Database["public"]["Tables"]["leads"]["Row"], "id" | "name" | "email">;

type Tab = "drafts" | "unmatched";

export function DraftQueueScaffold({
  coachId,
  initialDrafts,
  initialUnmatched = [],
  leads = [],
}: {
  coachId: string;
  initialDrafts: DraftRow[];
  initialUnmatched?: TranscriptRow[];
  leads?: LeadRow[];
}) {
  const [drafts, setDrafts] = useState<DraftRow[]>(initialDrafts);
  const [activeTab, setActiveTab] = useState<Tab>("drafts");
  useDraftRealtime(coachId, setDrafts);

  const advance = useCallback((draftId: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
  }, []);

  const unmatchedCount = initialUnmatched.length;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div role="tablist" aria-label="Draft queue sections" className="flex items-center gap-1 border-b border-border pb-3">
        <button
          role="tab"
          id="tab-drafts"
          aria-selected={activeTab === "drafts"}
          aria-controls="tabpanel-drafts"
          onClick={() => setActiveTab("drafts")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors min-h-[44px] ${
            activeTab === "drafts"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          Drafts
          {drafts.length > 0 && (
            <span className="ml-2 rounded-full text-xs font-mono px-1.5 py-0.5 bg-muted text-muted-foreground">
              {drafts.length}
            </span>
          )}
        </button>
        <button
          role="tab"
          id="tab-unmatched"
          aria-selected={activeTab === "unmatched"}
          aria-controls="tabpanel-unmatched"
          onClick={() => setActiveTab("unmatched")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors min-h-[44px] ${
            activeTab === "unmatched"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          Unmatched
          {unmatchedCount > 0 && (
            <span className="ml-2 rounded-full text-xs font-mono px-1.5 py-0.5 bg-muted text-muted-foreground">
              {unmatchedCount}
            </span>
          )}
        </button>
      </div>

      <div
        role="tabpanel"
        id="tabpanel-drafts"
        aria-labelledby="tab-drafts"
        tabIndex={0}
        hidden={activeTab !== "drafts"}
      >
        {drafts.length === 0 ? (
          <div className="rounded-2xl backdrop-blur-md bg-card dark:bg-white/5 border border-border dark:border-white/10 p-16 text-center">
            <h2 className="text-xl font-semibold mb-2">No drafts waiting</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Drafts appear here 24 hours before they&apos;re scheduled to send. You&apos;ll be
              notified when the first one is ready.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4" aria-live="polite">
              {drafts.length} draft{drafts.length === 1 ? "" : "s"} waiting
            </p>
            <AnimatePresence mode="wait">
              <DraftCard
                key={drafts[0]!.id}
                draft={drafts[0]!}
                onAdvance={() => advance(drafts[0]!.id)}
              />
            </AnimatePresence>
          </>
        )}
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
