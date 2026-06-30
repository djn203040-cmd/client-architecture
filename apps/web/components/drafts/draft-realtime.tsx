"use client";
import { useEffect, useState, useMemo, useId } from "react";
import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@client/database";

type DraftRow = Database["public"]["Tables"]["drafts"]["Row"] & {
  leads: { name: string } | null;
};

export function useDraftRealtime(
  coachId: string,
  opts?: {
    status?: "pending" | "held";
    initialDrafts?: DraftRow[];
    // Scope the subscription to a single lead (lead profile panel — #41).
    // When set, INSERT/UPDATE events for other leads are ignored.
    leadId?: string;
  },
): {
  drafts: DraftRow[];
  loading: boolean;
  rotateCurrent: () => void;
  removeDraft: (id: string) => void;
} {
  const status = opts?.status ?? "pending";
  const leadId = opts?.leadId;
  const [drafts, setDrafts] = useState<DraftRow[]>(opts?.initialDrafts ?? []);
  const [loading, setLoading] = useState(!opts?.initialDrafts);
  // When the caller doesn't seed rows server-side (e.g. the Held tab), the hook
  // must fetch the current bucket itself — otherwise it only ever shows drafts
  // that transition INTO this status while subscribed, so existing rows (every
  // already-held draft) never appear.
  const needsFetch = !opts?.initialDrafts;

  // Per-instance suffix so two hooks watching the same bucket never collide on
  // one Realtime topic. The dashboard subscribes to "held" twice — once for the
  // tab badge count, once inside the Held tab itself — and two channels sharing
  // a topic on the same socket make the second subscribe fail. A stable useId()
  // keeps each instance's channel distinct.
  const instanceId = useId();

  // Move the first draft to the back — used by the Skip button so the coach
  // can defer a draft without changing its status. Client-only; no DB write.
  const rotateCurrent = useMemo(
    () => () => {
      setDrafts((prev) => (prev.length > 1 ? [...prev.slice(1), prev[0]!] : prev));
    },
    [],
  );

  // Drop a draft from local state immediately after a hard delete. Realtime
  // doesn't reliably echo DELETE events back (the old record carries only the
  // PK, so the coach_id filter can't match), so the acting client removes the
  // card optimistically — same as approve/hold rely on the acting client.
  const removeDraft = useMemo(
    () => (id: string) => {
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    },
    [],
  );

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // Initial load for non-seeded buckets. Merge (dedupe by id) so we don't
    // clobber rows already delivered by a realtime event mid-fetch.
    if (needsFetch) {
      setLoading(true);
      let query = supabase
        .from("drafts")
        .select("*, leads(name)")
        .eq("coach_id", coachId)
        .eq("status", status);
      if (leadId) query = query.eq("lead_id", leadId);
      void query.then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setDrafts((prev) => {
            const seen = new Set(prev.map((d) => d.id));
            return [...prev, ...(data as DraftRow[]).filter((r) => !seen.has(r.id))];
          });
        }
        setLoading(false);
      });
    }

    const channel = supabase
      .channel(`coach-drafts-${status}-${coachId}${leadId ? `-${leadId}` : ""}-${instanceId}`)
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
          if (leadId && row.lead_id !== leadId) return;
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
          if (leadId && updated.lead_id !== leadId) return;
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
      // When fetching, the query above owns the loading flag; let it clear.
      .subscribe(() => {
        if (!needsFetch) setLoading(false);
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [coachId, status, leadId, needsFetch, instanceId]);

  const result = useMemo(
    () => ({ drafts, loading, rotateCurrent, removeDraft }),
    [drafts, loading, rotateCurrent, removeDraft],
  );
  return result;
}
