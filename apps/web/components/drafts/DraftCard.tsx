"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PencilSimple, CheckCircle, SkipForward, PauseCircle, ArrowsClockwise, WarningCircle } from "@phosphor-icons/react";
import { InlineDraftEditor } from "./InlineDraftEditor";
import { HeldDraftActions } from "./HeldDraftActions";
import { toast } from "sonner";
import type { Database } from "@client/database";
import { formatDateTimeInTZ } from "@/lib/format/datetime";

type DraftRow = Database["public"]["Tables"]["drafts"]["Row"] & {
  leads: { name: string } | null;
};

interface DraftCardProps {
  draft: DraftRow;
  variant?: "pending" | "held";
  surface?: "app" | "review";
  reviewToken?: string;
  onAdvance?: () => void;
  /**
   * Skip is a queue-only concept (defer to the next card without changing
   * status). On the lead profile page there is no "next" — pass false to hide
   * it and disable the `s` shortcut. #41.
   */
  showSkip?: boolean;
  /** Coach's IANA timezone — renders the scheduled send time in their clock. */
  timeZone?: string | null;
}

export function DraftCard({
  draft,
  variant = "pending",
  surface = "app",
  reviewToken,
  onAdvance,
  showSkip = true,
  timeZone,
}: DraftCardProps) {
  const [editing, setEditing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cardRef.current?.focus();
  }, [draft.id]);

  useEffect(() => {
    if (draft.status === "pending" && isRegenerating) {
      setIsRegenerating(false);
    }
  }, [draft.status, isRegenerating]);

  async function callPatch(payload: object) {
    const url =
      surface === "review"
        ? `/api/review/${reviewToken}`
        : `/api/drafts/${draft.id}`;
    return fetch(url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function setStatus(status: "approved" | "held", body?: string) {
    const r = await callPatch({ status, ...(body ? { body } : {}) });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      const reason = (data as { reason?: string }).reason;
      // Surface the real failure reason instead of a generic message.
      const message = reason
        ? `Couldn't ${status === "approved" ? "approve" : "hold"} — ${reason}.`
        : "This action didn't go through. Refresh and try again.";
      toast.error(message);
      return;
    }
    toast.success(status === "approved" ? "Approved" : "Held");
    onAdvance?.();
  }

  async function regenerate() {
    setIsRegenerating(true);
    const r = await fetch(`/api/drafts/${draft.id}/regenerate`, { method: "POST" });
    if (!r.ok) {
      toast.error("Regeneration failed. Try again.");
      setIsRegenerating(false);
    } else {
      toast.success("Regenerating draft...");
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (editing || variant === "held") return;
    if (e.key === "a" || e.key === "A") { e.preventDefault(); void setStatus("approved"); }
    if (showSkip && (e.key === "s" || e.key === "S")) { e.preventDefault(); onAdvance?.(); }
    if (e.key === "h" || e.key === "H") { e.preventDefault(); void setStatus("held"); }
    if (e.key === "Escape") { (e.target as HTMLElement).blur(); }
  }

  if (editing) {
    return (
      <InlineDraftEditor
        draft={draft}
        onCancel={() => setEditing(false)}
        onSaveAndApprove={(body) => setStatus("approved", body)}
      />
    );
  }

  // Use draft.created_at as the fallback (stable timestamp) rather than
  // Date.now() (changes every render → hydration mismatch + meaningless value).
  const sched = new Date(draft.scheduled_send_at ?? draft.created_at);
  const isReview = surface === "review";
  const wrapClass = isReview
    ? "bg-white/10 backdrop-blur-md border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
    : "backdrop-blur-md bg-card dark:bg-white/5 border border-border dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";

  return (
    <motion.div
      ref={cardRef}
      tabIndex={0}
      role="article"
      aria-label={`Draft for ${draft.leads?.name ?? "lead"}, message ${draft.touchpoint_index} of ${draft.total_touchpoints ?? "?"}`}
      onKeyDown={onKeyDown}
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`rounded-2xl p-6 focus:outline-none focus:ring-2 focus:ring-primary-soft focus:ring-offset-2 ${wrapClass}`}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold leading-[1.25]">
            {draft.leads?.name ?? "Unknown lead"}
          </h2>
          {/* Send time renders in the coach's timezone (fixed, not the
              browser's) so server and client agree — no hydration mismatch. */}
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Message {draft.touchpoint_index} of {draft.total_touchpoints ?? "?"} &middot;{" "}
            {formatDateTimeInTZ(sched, timeZone)}
          </p>
          {draft.confidence_level === "low" && (
            <span className="inline-flex items-center gap-1 mt-2 text-xs px-2 py-1 rounded-md bg-[oklch(72%_0.12_70)] text-[oklch(40%_0.10_65)] dark:bg-[oklch(25%_0.08_65)] dark:text-[oklch(85%_0.08_65)]">
              <WarningCircle weight="fill" className="size-3" />
              Voice model needs more examples
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isReview && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={regenerate}
                    disabled={isRegenerating}
                    aria-label="Regenerate draft"
                    className="min-h-[44px] min-w-[44px]"
                  >
                    <ArrowsClockwise
                      weight="regular"
                      className={`size-4 ${isRegenerating ? "animate-spin" : ""}`}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isRegenerating ? "Generating new draft..." : "Regenerate draft"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {variant === "pending" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditing(true)}
              aria-label="Edit draft"
              className="min-h-[44px] min-w-[44px]"
            >
              <PencilSimple weight="regular" className="size-4" />
            </Button>
          )}
        </div>
      </header>

      {draft.subject && (
        <p className="text-sm font-medium mt-4">Subject: {draft.subject}</p>
      )}
      <p className="mt-4 whitespace-pre-wrap text-sm leading-[1.5] max-w-[65ch]">
        {draft.body}
      </p>

      {variant === "pending" && (
        <footer className="flex items-center gap-3 mt-6">
          <Button className="min-h-[44px]" onClick={() => setStatus("approved")}>
            <CheckCircle weight="regular" className="size-4 mr-2" />
            Approve <KeyBadge k="A" />
          </Button>
          {showSkip && (
            <Button className="min-h-[44px]" variant="outline" onClick={onAdvance}>
              <SkipForward weight="regular" className="size-4 mr-2" />
              Skip <KeyBadge k="S" />
            </Button>
          )}
          <Button className="min-h-[44px]" variant="outline" onClick={() => setStatus("held")}>
            <PauseCircle weight="regular" className="size-4 mr-2" />
            Hold <KeyBadge k="H" />
          </Button>
        </footer>
      )}

      {variant === "held" && (
        <HeldDraftActions draft={draft} onAdvance={onAdvance} />
      )}
    </motion.div>
  );
}

function KeyBadge({ k }: { k: string }) {
  return (
    <kbd
      aria-hidden="true"
      className="ml-2 inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-md text-xs font-mono bg-black/5 dark:bg-white/10 border border-border dark:border-white/10"
    >
      {k}
    </kbd>
  );
}
