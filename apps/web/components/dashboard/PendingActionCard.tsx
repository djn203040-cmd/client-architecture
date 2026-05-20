"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface PendingAction {
  id: string;
  coach_id: string;
  lead_id: string | null;
  type: string;
  payload: Record<string, string>;
  created_at: string;
}

interface Props {
  action: PendingAction;
}

export function PendingActionCard({ action }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function dismiss(actionType: string) {
    setLoading(actionType);
    try {
      const r = await fetch(`/api/pending-actions/${action.id}/dismiss`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: actionType }),
      });
      if (!r.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Couldn't update. Try again.");
    } finally {
      setLoading(null);
    }
  }

  async function startFollowUp() {
    setLoading("start_follow_up");
    try {
      const r = await fetch("/api/sequences/enroll", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          leadId: action.lead_id,
          track: "call_completed",
          calendarEventId: action.payload.calendarEventId,
        }),
      });
      if (!r.ok) throw new Error();
      await fetch(`/api/pending-actions/${action.id}/dismiss`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "start_follow_up" }),
      });
      toast.success("Follow-up sequence started.");
      router.refresh();
    } catch {
      toast.error("Couldn't start sequence. Try again.");
    } finally {
      setLoading(null);
    }
  }

  async function startIntakeSequence() {
    setLoading("start_sequence");
    try {
      const r = await fetch("/api/sequences/enroll", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId: action.lead_id, track: "no_show" }),
      });
      if (!r.ok) throw new Error();
      await fetch(`/api/pending-actions/${action.id}/dismiss`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "start_sequence" }),
      });
      toast.success("Intake sequence started.");
      router.refresh();
    } catch {
      toast.error("Couldn't start sequence. Try again.");
    } finally {
      setLoading(null);
    }
  }

  const leadName = action.payload?.leadName ?? "Lead";

  if (action.type === "call_follow_up") {
    return (
      <div className="rounded-2xl backdrop-blur-md bg-accent/5 dark:bg-accent/10 border border-accent/20 p-6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <p className="text-sm font-medium mb-1">{leadName}</p>
        <p className="text-xs text-muted-foreground mb-4">
          Call completed. How would you like to proceed?
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={startFollowUp}
            disabled={!!loading}
          >
            {loading === "start_follow_up" ? "Starting…" : "Start follow-up"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => dismiss("closed")}
            disabled={!!loading}
          >
            {loading === "closed" ? "Saving…" : "Closed"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => dismiss("rescheduled")}
            disabled={!!loading}
          >
            {loading === "rescheduled" ? "Saving…" : "Rescheduled"}
          </Button>
        </div>
      </div>
    );
  }

  if (action.type === "lead_intake") {
    return (
      <div className="rounded-2xl backdrop-blur-md bg-accent/5 dark:bg-accent/10 border border-accent/20 p-6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <p className="text-sm font-medium mb-1">{leadName}</p>
        <p className="text-xs text-muted-foreground mb-4">
          New lead. Start intake sequence?
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={startIntakeSequence}
            disabled={!!loading}
          >
            {loading === "start_sequence" ? "Starting…" : "Yes, start sequence"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => dismiss("dismiss")}
            disabled={!!loading}
          >
            {loading === "dismiss" ? "Dismissing…" : "Dismiss"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
