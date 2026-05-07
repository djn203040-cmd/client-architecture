"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@client/database";

type DraftRow = Database["public"]["Tables"]["drafts"]["Row"] & {
  leads: { name: string } | null;
};

export function useDraftRealtime(
  coachId: string,
  setDrafts: React.Dispatch<React.SetStateAction<DraftRow[]>>
) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("coach-drafts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "drafts",
          filter: `coach_id=eq.${coachId}`,
        },
        (payload) => {
          setDrafts((prev) => [payload.new as DraftRow, ...prev]);
        }
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
          setDrafts((prev) =>
            prev.map((d) =>
              d.id === (payload.new as DraftRow).id
                ? { ...d, ...(payload.new as DraftRow) }
                : d
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coachId, setDrafts]);
}
