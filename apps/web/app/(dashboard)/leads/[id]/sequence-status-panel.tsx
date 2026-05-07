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
  const canStart = !isTerminalState(status) && status !== "in_sequence";

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
        disabled={!canStart}
        aria-label="Start Intake Sequence"
      >
        Start Intake Sequence
      </Button>
      <p className="text-xs text-muted-foreground">
        Phase 3 wires this button to Inngest. Phase 1 ships the surface.
      </p>
    </section>
  );
}
