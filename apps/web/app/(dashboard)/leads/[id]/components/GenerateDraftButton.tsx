"use client";
import { useState, useEffect } from "react";
import { Sparkle, ArrowsClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";
import { toast } from "sonner";
import type { TLeadStatus } from "@client/shared/types";

const HARD_BLOCK_STATES: TLeadStatus[] = ["unsubscribed", "do_not_contact", "bounced"];

interface Props {
  leadId: string;
  leadStatus: TLeadStatus;
}

export function GenerateDraftButton({ leadId, leadStatus }: Props) {
  const [generating, setGenerating] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  useEffect(() => {
    if (!draftId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`draft-ready-${draftId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "drafts",
          filter: `id=eq.${draftId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const newStatus = payload.new["status"] as string;
          if (newStatus === "pending") {
            setGenerating(false);
            setDraftId(null);
            toast.success("Draft ready — check your queue.");
          } else if (newStatus === "error") {
            setGenerating(false);
            setDraftId(null);
            toast.error("Draft generation failed. Try again.");
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [draftId]);

  // D-16: Hard-blocked states — hide entirely. Must happen AFTER all hooks
  // to keep hook order stable across renders when status flips.
  if (HARD_BLOCK_STATES.includes(leadStatus)) return null;

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg =
          typeof body === "object" && body !== null && "error" in body
            ? (body as { error: string }).error
            : "Generation failed. Try again.";
        toast.error(msg);
        setGenerating(false);
        return;
      }

      const data = (await res.json()) as { draftId: string };
      setDraftId(data.draftId);
    } catch {
      toast.error("Network error. Try again.");
      setGenerating(false);
    }
  }

  return (
    <Button
      onClick={handleGenerate}
      disabled={generating}
      className="min-h-[44px]"
    >
      {generating ? (
        <>
          <ArrowsClockwise size={16} className="mr-2 animate-spin" aria-hidden="true" />
          Generating...
        </>
      ) : (
        <>
          <Sparkle size={16} className="mr-2" weight="fill" aria-hidden="true" />
          Generate draft
        </>
      )}
    </Button>
  );
}
