"use client";
import { useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { useDraftRealtime } from "./draft-realtime";
import { DraftCard } from "./DraftCard";

export function HeldTab({
  coachId,
  timeZone,
}: {
  coachId: string;
  /** Coach's IANA timezone — renders draft send times in their local clock. */
  timeZone?: string | null;
}) {
  const { drafts, loading } = useDraftRealtime(coachId, { status: "held" });

  const sorted = useMemo(
    () => [...drafts].sort((a, b) => (b.held_at ?? "").localeCompare(a.held_at ?? "")),
    [drafts],
  );

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-16 text-center">
        <p className="text-sm text-muted-foreground">Nothing on hold.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {sorted.map((d) => (
          <DraftCard key={d.id} draft={d} variant="held" timeZone={timeZone} />
        ))}
      </AnimatePresence>
    </div>
  );
}
