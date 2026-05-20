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
): { drafts: DraftRow[]; loading: boolean } {
  const status = opts?.status ?? "pending";
  const [drafts, setDrafts] = useState<DraftRow[]>(opts?.initialDrafts ?? []);
  const [loading, setLoading] = useState(!opts?.initialDrafts);

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
            setDrafts((prev) => [row, ...prev]);
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
          setDrafts((prev) => {
            const exists = prev.some((d) => d.id === updated.id);
            if (updated.status === status) {
              if (exists) {
                return prev.map((d) =>
                  d.id === updated.id ? { ...d, ...updated } : d,
                );
              }
              // Draft transitioned into this status bucket (e.g. pending -> held)
              return [updated, ...prev];
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

  const result = useMemo(() => ({ drafts, loading }), [drafts, loading]);
  return result;
}
