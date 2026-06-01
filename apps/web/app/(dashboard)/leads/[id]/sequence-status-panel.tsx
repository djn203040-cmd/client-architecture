"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TLeadStatus } from "@client/shared/types";
import { isTerminalState } from "@client/shared";
import type { TSequenceView, TSequenceStepTone } from "@/lib/sequences/progress";

// Accent colour for the current step's status line, by tone.
const TONE_CLASS: Record<TSequenceStepTone, string> = {
  approved: "text-emerald-600 dark:text-emerald-400 font-medium",
  awaiting: "text-amber-600 dark:text-amber-400 font-medium",
  preparing: "text-muted-foreground",
  hold: "text-orange-600 dark:text-orange-400 font-medium",
  error: "text-red-600 dark:text-red-400 font-medium",
  overdue: "text-red-600 dark:text-red-400 font-medium",
  paused: "text-sky-600 dark:text-sky-400 font-medium",
  sent: "text-muted-foreground",
  done: "text-muted-foreground",
  scheduled: "text-muted-foreground",
};

export function SequenceStatusPanel({
  leadId,
  status,
  sequence,
}: {
  leadId: string;
  status: TLeadStatus;
  sequence?: TSequenceView | null;
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

  const finished = sequence?.status === "completed";
  const nextSendDisplay = sequence
    ? finished
      ? "Complete"
      : sequence.status === "paused"
        ? "Paused"
        : sequence.status === "cancelled"
          ? "Stopped"
          : sequence.status === "held"
            ? "On hold"
            : (sequence.nextSendLabel ?? "—")
    : "—";

  return (
    <section className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold">Sequence</h2>
        {sequence && (
          <span className="text-xs text-muted-foreground">
            {finished
              ? `${sequence.totalSteps} of ${sequence.totalSteps} steps`
              : `Step ${sequence.currentStep} of ${sequence.totalSteps}`}
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status</span>
          <span className="font-mono">{status}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Next send</span>
          <span className="font-mono text-muted-foreground">{nextSendDisplay}</span>
        </div>
      </div>

      {sequence && sequence.steps.length > 0 && (
        <div className="space-y-1 pt-1">
          <p className="text-xs font-medium text-muted-foreground">{sequence.trackLabel}</p>
          <ol className="pt-1">
            {sequence.steps.map((step, i) => {
              const isLast = i === sequence.steps.length - 1;
              const done = step.state === "done";
              const next = step.state === "next";
              return (
                <li key={step.index} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={[
                        "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-medium transition-colors",
                        done
                          ? "border-primary bg-primary text-primary-foreground"
                          : next
                            ? "border-primary bg-background text-primary ring-2 ring-primary/25"
                            : "border-border bg-transparent text-muted-foreground",
                      ].join(" ")}
                      aria-hidden
                    >
                      {done ? <Check className="h-3 w-3" /> : step.index}
                    </span>
                    {!isLast && (
                      <span
                        className={[
                          "my-1 w-px flex-1",
                          done ? "bg-primary/50" : "bg-border",
                        ].join(" ")}
                      />
                    )}
                  </div>
                  <div className={isLast ? "pb-0.5" : "pb-4"}>
                    <p
                      className={[
                        "text-sm leading-5",
                        next ? "font-semibold text-foreground" : "font-medium",
                        !done && !next ? "text-muted-foreground" : "",
                      ].join(" ")}
                    >
                      Step {step.index}
                    </p>
                    <p className={["text-xs", TONE_CLASS[step.tone]].join(" ")}>{step.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {canStart && (
        <Button
          variant="outline"
          className="w-full"
          disabled={loading}
          onClick={startSequence}
          aria-label="Start Intake Sequence"
        >
          {loading ? "Starting…" : "Start Intake Sequence"}
        </Button>
      )}
    </section>
  );
}
