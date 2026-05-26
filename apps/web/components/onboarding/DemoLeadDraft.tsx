"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";

interface Props {
  draftId: string;
  draftBody: string;
  leadName: string;
  onApproved: (celebrationMessage: string) => void;
}

export function DemoLeadDraft({ draftId, draftBody, leadName, onApproved }: Props) {
  const [approving, setApproving] = useState(false);

  async function handleApprove() {
    setApproving(true);
    try {
      const r = await fetch("/api/onboarding/demo-approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        toast.error(body.error ?? "Couldn't approve draft. Try again.");
        return;
      }
      const { celebrationMessage } = await r.json();
      onApproved(celebrationMessage);
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded-md bg-primary text-primary-foreground font-medium">
          Onboarding demo
        </span>
        <span className="text-xs text-muted-foreground">To: {leadName}</span>
      </div>

      <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground pb-2 border-b border-border">
          <Sparkle weight="fill" className="w-3.5 h-3.5 text-accent" />
          AI-generated in your voice
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{draftBody}</p>
      </div>

      <Button onClick={handleApprove} disabled={approving} className="w-full">
        {approving ? "Approving…" : "Approve this draft"}
      </Button>
    </div>
  );
}
