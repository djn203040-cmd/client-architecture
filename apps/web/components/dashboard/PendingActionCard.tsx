"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/lib/i18n/provider";

interface Props {
  id: string;
  type: "call_follow_up" | "lead_intake";
  leadName: string;
  leadEmail: string;
}

export function PendingActionCard({ id, type, leadName, leadEmail }: Props) {
  const router = useRouter();
  const t = useDictionary();
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
      toast.success(t.dashboard.pendingActions.done);
      router.refresh();
    } catch {
      toast.error(t.dashboard.pendingActions.failed);
    } finally {
      setLoading(null);
    }
  }

  if (type === "call_follow_up") {
    return (
      <div className="rounded-2xl backdrop-blur-md bg-accent/5 dark:bg-accent/10 border border-accent/20 p-6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <p className="text-sm font-medium mb-1">{leadName}</p>
        <p className="text-xs text-muted-foreground mb-4">
          {t.dashboard.pendingActions.callPrompt}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => act("start_follow_up")} disabled={!!loading}>
            {loading === "start_follow_up"
              ? t.dashboard.pendingActions.starting
              : t.dashboard.pendingActions.startFollowUp}
          </Button>
          <Button size="sm" variant="outline" onClick={() => act("closed")} disabled={!!loading}>
            {loading === "closed" ? t.common.saving : t.dashboard.pendingActions.closed}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => act("rescheduled")} disabled={!!loading}>
            {loading === "rescheduled" ? t.common.saving : t.dashboard.pendingActions.rescheduled}
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
          {t.dashboard.pendingActions.intakePrompt(leadEmail)}
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => act("enroll")} disabled={!!loading}>
            {loading === "enroll"
              ? t.dashboard.pendingActions.starting
              : t.dashboard.pendingActions.startSequence}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => act("dismiss")} disabled={!!loading}>
            {loading === "dismiss"
              ? t.dashboard.pendingActions.dismissing
              : t.dashboard.pendingActions.dismiss}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
