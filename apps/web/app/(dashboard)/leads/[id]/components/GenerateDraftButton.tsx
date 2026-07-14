"use client";
import { useState, useEffect } from "react";
import { Sparkle, ArrowsClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { createClient, realtimeAuthReady } from "@/lib/supabase/browser";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useDictionary } from "@/lib/i18n/provider";
import type { TLeadStatus } from "@client/shared/types";

const HARD_BLOCK_STATES: TLeadStatus[] = ["unsubscribed", "do_not_contact", "bounced"];

interface Props {
  leadId: string;
  leadStatus: TLeadStatus;
}

export function GenerateDraftButton({ leadId, leadStatus }: Props) {
  const t = useDictionary();
  const [generating, setGenerating] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  useEffect(() => {
    if (!draftId) return;

    const supabase = createClient();
    let settled = false;

    const finish = (status: string) => {
      if (settled) return;
      settled = true;
      setGenerating(false);
      setDraftId(null);
      if (status === "error") {
        toast.error(t.leads.generate.genFailed);
      } else {
        toast.success(t.leads.generate.ready);
      }
    };

    // Fast path: realtime UPDATE event. The join must carry the user JWT
    // (see realtimeAuthReady), otherwise the subscription registers with anon
    // claims and RLS drops every event (the poll below still catches it).
    let channel: RealtimeChannel | null = null;
    void realtimeAuthReady(supabase).then(() => {
      if (settled) return;
      channel = supabase
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
            if (newStatus !== "generating") finish(newStatus);
          },
        )
        .subscribe();
    });

    // Fallback: poll every 2s in case realtime doesn't deliver
    // (RLS / publication / network can all silently drop UPDATE events).
    const poll = setInterval(async () => {
      if (settled) return;
      const { data } = await supabase
        .from("drafts")
        .select("status")
        .eq("id", draftId)
        .maybeSingle();
      const status = data?.status;
      if (status && status !== "generating") finish(status);
    }, 2000);

    // Hard timeout, stop showing the spinner after 90s no matter what
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      setGenerating(false);
      setDraftId(null);
      toast.error(t.leads.generate.timeout);
    }, 90_000);

    return () => {
      clearInterval(poll);
      clearTimeout(timeout);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [draftId, t]);

  // D-16: Hard-blocked states, hide entirely. Must happen AFTER all hooks
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
            : t.leads.generate.failedFallback;
        toast.error(msg);
        setGenerating(false);
        return;
      }

      const data = (await res.json()) as { draftId: string };
      setDraftId(data.draftId);
    } catch {
      toast.error(t.leads.generate.networkError);
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
          {t.leads.generate.generating}
        </>
      ) : (
        <>
          <Sparkle size={16} className="mr-2" weight="fill" aria-hidden="true" />
          {t.leads.generate.idle}
        </>
      )}
    </Button>
  );
}
