"use client";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@client/database";

type DraftRow = Database["public"]["Tables"]["drafts"]["Row"] & {
  leads: { name: string } | null;
};

export function useDraftRealtime(
  coachId: string,
  opts?: { status?: "pending" | "held"; initialDrafts?: DraftRow[] },
): { drafts: DraftRow[]; loading: boolean; rotateCurrent: () => void } {
  const status = opts?.status ?? "pending";
  const [drafts, setDrafts] = useState<DraftRow[]>(opts?.initialDrafts ?? []);
  const [loading, setLoading] = useState(!opts?.initialDrafts);

  // Move the first draft to the back — used by the Skip button so the coach
  // can defer a draft without changing its status. Client-only; no DB write.
  const rotateCurrent = useMemo(
    () => () => {
      setDrafts((prev) => (prev.length > 1 ? [...prev.slice(1), prev[0]!] : prev));
    },
    [],
  );

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`coach-drafts-${status}-${coachId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "drafts",
          filter: `coach_id=eq.${coachId}`,
        },
        (payload) => {
          const row = payload.new as DraftRow;
          if (row.status === status) {
            setDrafts((prev) => [...prev, row]);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "drafts",
          filter: `coach_id=eq.${coachId}`,
        },
        (payload) => {
          const updated = payload.new as DraftRow;
          const belongsInBucket = updated.status === status;
          setDrafts((prev) => {
            const exists = prev.some((d) => d.id === updated.id);
            if (belongsInBucket) {
              if (exists) {
                return prev.map((d) =>
                  d.id === updated.id ? { ...d, ...updated } : d,
                );
              }
              // Draft transitioned INTO this status bucket — most commonly:
              // a regenerated draft coming back from status='generating'.
              // APPEND it so it doesn't displace the card the coach is
              // currently working on (the previous behavior prepended and
              // looked like "the next card left after 3 seconds").
              return [...prev, updated];
            }
            // Draft transitioned out of this status bucket
            return prev.filter((d) => d.id !== updated.id);
          });
        },
      )
      .subscribe(() => setLoading(false));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coachId, status]);

  const result = useMemo(
    () => ({ drafts, loading, rotateCurrent }),
    [drafts, loading, rotateCurrent],
  );
  return result;
}
