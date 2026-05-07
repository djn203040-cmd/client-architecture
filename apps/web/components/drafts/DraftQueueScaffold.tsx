"use client";
import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { DraftCard } from "./DraftCard";
import { useDraftRealtime } from "./draft-realtime";
import type { Database } from "@client/database";

type DraftRow = Database["public"]["Tables"]["drafts"]["Row"] & {
  leads: { name: string } | null;
};

export function DraftQueueScaffold({
  coachId,
  initialDrafts,
}: {
  coachId: string;
  initialDrafts: DraftRow[];
}) {
  const [drafts, setDrafts] = useState<DraftRow[]>(initialDrafts);
  useDraftRealtime(coachId, setDrafts);

  const advance = useCallback((draftId: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
  }, []);

  if (drafts.length === 0) {
    return (
      <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-16 text-center">
        <h2 className="text-xl font-semibold mb-2">No drafts waiting</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Drafts appear here 24 hours before they&apos;re scheduled to send. You&apos;ll be
          notified when the first one is ready.
        </p>
      </div>
    );
  }

  const current = drafts[0]!;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {drafts.length} draft{drafts.length === 1 ? "" : "s"} waiting
      </p>
      <AnimatePresence mode="wait">
        <DraftCard
          key={current.id}
          draft={current}
          onAdvance={() => advance(current.id)}
        />
      </AnimatePresence>
    </div>
  );
}
