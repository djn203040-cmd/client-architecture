"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  id: string;
  type: "call_follow_up" | "lead_intake";
  leadName: string;
  leadEmail: string;
}

export function PendingActionCard({ id, type, leadName, leadEmail }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function act(action: string) {
    setLoading(action);
    try {
      const r = await fetch(`/api/pending-actions/${id}/dismiss`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!r.ok) throw new Error("Action failed");
      toast.success("Done.");
      router.refresh();
    } catch {
      toast.error("Couldn't complete this action. Try again.");
    } finally {
      setLoading(null);
    }
  }

  if (type === "call_follow_up") {
    return (
      <div className="rounded-2xl backdrop-blur-md bg-accent/5 dark:bg-accent/10 border border-accent/20 p-6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <p className="text-sm font-medium mb-1">{leadName}</p>
        <p className="text-xs text-muted-foreground mb-4">
          How did the call go?
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => act("start_follow_up")} disabled={!!loading}>
            {loading === "start_follow_up" ? "Starting…" : "Start follow-up"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => act("closed")} disabled={!!loading}>
            {loading === "closed" ? "Saving…" : "Closed"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => act("rescheduled")} disabled={!!loading}>
            {loading === "rescheduled" ? "Saving…" : "Rescheduled"}
          </Button>
        </div>

      </div>
    );
  }

  if (type === "lead_intake") {
    return (
      <div className="rounded-2xl backdrop-blur-md bg-accent/5 dark:bg-accent/10 border border-accent/20 p-6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <p className="text-sm font-medium mb-1">{leadName}</p>
        <p className="text-xs text-muted-foreground mb-4">
          {leadEmail} emailed you — start their intake sequence?
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => act("enroll")} disabled={!!loading}>
            {loading === "enroll" ? "Starting…" : "Yes, start sequence"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => act("dismiss")} disabled={!!loading}>
            {loading === "dismiss" ? "Dismissing…" : "Dismiss"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
