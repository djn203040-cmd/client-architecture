"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { TLeadStatus } from "@client/shared/types";
import { isTerminalState } from "@client/shared";

export function SequenceStatusPanel({
  leadId,
  status,
}: {
  leadId: string;
  status: TLeadStatus;
}) {
  const router = useRouter();
  const canStart = !isTerminalState(status) && status !== "in_sequence";
  const [loading, setLoading] = useState(false);

  async function startSequence() {
    setLoading(true);
    try {
      const r = await fetch("/api/sequences/enroll", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId, track: "no_show" }),
      });
      if (!r.ok) {
        toast.error("Couldn't start sequence. Try again.");
        return;
      }
      toast.success("Intake sequence started.");
      router.refresh();
    } catch {
      toast.error("Couldn't start sequence. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4">
      <h2 className="text-xl font-semibold">Sequence</h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status</span>
          <span className="font-mono">{status}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Next send</span>
          <span className="font-mono text-muted-foreground">—</span>
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full"
        disabled={!canStart || loading}
        onClick={startSequence}
        aria-label="Start Intake Sequence"
      >
        {loading ? "Starting…" : "Start Intake Sequence"}
      </Button>
    </section>
  );
}
