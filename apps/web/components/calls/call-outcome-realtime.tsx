"use client";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@client/database";

type CallOutcomeRow = Database["public"]["Tables"]["call_outcomes"]["Row"] & {
  leads: { name: string } | null;
};

type CallOutcomeStatus = Database["public"]["Enums"]["call_outcome_status"];

/**
 * Live call-outcome queue, cloned from {@link useDraftRealtime}. Subscribes to
 * postgres_changes on `call_outcomes` scoped to the coach (RLS confines the
 * stream to their own rows, T-07-19) and keeps the bucket for one lifecycle
 * `status` in sync. Optionally narrowed to a single lead for the lead-profile
 * panel (D-20): events for other leads are ignored.
 *
 * A resolve from any surface (dashboard card, lead panel, Slack) flips the row
 * to `resolved`, which drops it out of the Awaiting bucket here automatically.
 */
export function useCallOutcomeRealtime(
  coachId: string,
  opts?: {
    status?: CallOutcomeStatus;
    initialOutcomes?: CallOutcomeRow[];
    // Scope the subscription to a single lead (lead-profile panel, D-20).
    leadId?: string;
  },
): { outcomes: CallOutcomeRow[]; loading: boolean } {
  const status = opts?.status ?? "awaiting_outcome";
  const leadId = opts?.leadId;
  const [outcomes, setOutcomes] = useState<CallOutcomeRow[]>(
    opts?.initialOutcomes ?? [],
  );
  const [loading, setLoading] = useState(!opts?.initialOutcomes);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(
        `coach-call-outcomes-${status}-${coachId}${leadId ? `-${leadId}` : ""}`,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_outcomes",
          filter: `coach_id=eq.${coachId}`,
        },
        (payload) => {
          const row = payload.new as CallOutcomeRow;
          if (leadId && row.lead_id !== leadId) return;
          if (row.status === status) {
            setOutcomes((prev) =>
              prev.some((o) => o.id === row.id) ? prev : [...prev, row],
            );
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_outcomes",
          filter: `coach_id=eq.${coachId}`,
        },
        (payload) => {
          const updated = payload.new as CallOutcomeRow;
          if (leadId && updated.lead_id !== leadId) return;
          const belongsInBucket = updated.status === status;
          setOutcomes((prev) => {
            const exists = prev.some((o) => o.id === updated.id);
            if (belongsInBucket) {
              if (exists) {
                return prev.map((o) =>
                  o.id === updated.id ? { ...o, ...updated } : o,
                );
              }
              // Row transitioned INTO this bucket (e.g. scheduled ->
              // awaiting_outcome when the monitor fires). Append so it never
              // displaces the card the coach is currently triaging.
              return [...prev, updated];
            }
            // Row transitioned OUT of this bucket (resolved / cancelled).
            return prev.filter((o) => o.id !== updated.id);
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "call_outcomes",
          filter: `coach_id=eq.${coachId}`,
        },
        (payload) => {
          const removed = payload.old as Partial<CallOutcomeRow>;
          setOutcomes((prev) => prev.filter((o) => o.id !== removed.id));
        },
      )
      .subscribe(() => setLoading(false));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coachId, status, leadId]);

  return useMemo(() => ({ outcomes, loading }), [outcomes, loading]);
}

export type { CallOutcomeRow };
