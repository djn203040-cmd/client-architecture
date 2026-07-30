import type { StuckSend } from "@/lib/admin/stuck-sends";
import { StuckSendRow } from "./StuckSendRow";
import { CheckCircle, Warning } from "@phosphor-icons/react/dist/ssr";

/**
 * Drafts stranded mid-send (#139). Before this, an unwitnessed stuck send
 * existed only as a `console.error` — you had to already know to go looking.
 */
export function StuckSendsPanel({ rows }: { rows: StuckSend[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl bg-card dark:bg-white/5 border border-border dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-6">
        <h3 className="text-sm text-muted-foreground mb-3">Stuck sends</h3>
        <p className="flex items-center gap-2 text-sm">
          <CheckCircle weight="fill" className="size-4 text-[oklch(60%_0.14_145)]" />
          No sends are stuck. Every approved draft either went out or is still on its timer.
        </p>
      </div>
    );
  }

  const needingDecision = rows.filter((r) => !r.witnessed).length;

  return (
    <div className="rounded-2xl bg-card dark:bg-white/5 border border-amber-500/30 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden">
      <div className="p-6 pb-4 border-b border-border">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Warning weight="fill" className="size-4 text-amber-600 dark:text-amber-400" />
          {rows.length} stuck send{rows.length === 1 ? "" : "s"}
          {needingDecision > 0 && (
            <span className="text-muted-foreground font-normal">
              {` · ${needingDecision} need${needingDecision === 1 ? "s" : ""} a decision`}
            </span>
          )}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          These drafts were claimed for sending and the send never finished. They are never
          retried automatically — a duplicate email to a lead can&apos;t be taken back.
        </p>
      </div>
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <StuckSendRow key={row.draft_id} row={row} />
        ))}
      </div>
    </div>
  );
}
