"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ApproveButton } from "@/components/ui/approve-button";
import { CalendarX, PhoneCall, Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { formatDateTimeInTZ } from "@/lib/format/datetime";
import type { CallOutcomeRow } from "./call-outcome-realtime";

type Outcome = "no_show" | "completed" | "converted";

const RESOLVED_LABEL: Record<string, string> = {
  no_show: "No show",
  completed: "Call completed",
  converted: "Converted",
};

interface Props {
  outcome: CallOutcomeRow;
  leadName: string;
  /** "awaiting" renders the three action buttons; "readonly" shows the
   *  resolved outcome (or the upcoming call window) with no actions. */
  variant?: "awaiting" | "readonly";
  /** Coach's IANA timezone — renders the call window in their local clock. */
  timeZone?: string | null;
}

export function CallOutcomeCard({
  outcome,
  leadName,
  variant = "awaiting",
  timeZone,
}: Props) {
  const [pending, setPending] = useState<Outcome | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (variant === "awaiting") cardRef.current?.focus();
  }, [outcome.id, variant]);

  async function record(value: Outcome) {
    if (pending) return;
    setPending(value);
    try {
      const r = await fetch(`/api/call-outcomes/${outcome.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outcome: value }),
      });
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { reason?: string };
        // 409 = already resolved elsewhere (Slack, another tab). Realtime will
        // drop the card; surface the real reason so the coach isn't confused.
        const message = data.reason
          ? `Couldn't record — ${data.reason}.`
          : "This call was already recorded. The card will update shortly.";
        toast.error(message);
        setPending(null);
        return;
      }
      // 200: realtime flips the row to `resolved` and drops the card. Keep the
      // buttons disabled (pending stays set) so a double-click can't re-fire.
      toast.success(
        value === "converted" ? "Converted 🎉" : `Recorded: ${RESOLVED_LABEL[value]}`,
      );
    } catch {
      toast.error("Network hiccup. Refresh and try again.");
      setPending(null);
    }
  }

  const when = outcome.ends_at ?? outcome.scheduled_at ?? outcome.created_at;
  const whenLabel = formatDateTimeInTZ(new Date(when), timeZone);

  if (variant === "readonly") {
    const resolved = outcome.outcome
      ? RESOLVED_LABEL[outcome.outcome] ?? outcome.outcome
      : null;
    return (
      <div className="rounded-2xl p-5 backdrop-blur-md bg-card dark:bg-white/5 border border-border dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold leading-[1.25]">{leadName}</h3>
            <p className="text-xs font-mono text-muted-foreground mt-1">{whenLabel}</p>
          </div>
          {resolved && (
            <span className="shrink-0 inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
              {resolved}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      tabIndex={0}
      role="article"
      aria-label={`How did the call with ${leadName} go?`}
      initial={reduce ? { opacity: 0 } : { x: 300, opacity: 0 }}
      animate={reduce ? { opacity: 1 } : { x: 0, opacity: 1 }}
      exit={reduce ? { opacity: 0 } : { x: -300, opacity: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="rounded-2xl p-6 focus:outline-none focus:ring-2 focus:ring-primary-soft focus:ring-offset-2 backdrop-blur-md bg-card dark:bg-white/5 border border-border dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
    >
      <header>
        <h2 className="text-xl font-semibold leading-[1.25]">
          How did the call with {leadName} go?
        </h2>
        <p className="text-xs font-mono text-muted-foreground mt-1">{whenLabel}</p>
      </header>

      <footer className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6">
        <ApproveButton
          className="min-h-[44px] flex-1"
          onClick={() => record("completed")}
          disabled={pending !== null}
          aria-label="Call completed"
        >
          <PhoneCall weight="regular" className="size-4 mr-2" />
          Call completed
        </ApproveButton>
        <Button
          variant="outline"
          className="min-h-[44px] flex-1"
          onClick={() => record("no_show")}
          disabled={pending !== null}
          aria-label="No show"
        >
          <CalendarX weight="regular" className="size-4 mr-2" />
          No show
        </Button>
        <Button
          className="min-h-[44px] flex-1 bg-[oklch(80%_0.14_85)] text-[oklch(32%_0.10_75)] hover:bg-[oklch(83%_0.14_85)] dark:bg-[oklch(72%_0.13_85)] dark:text-[oklch(25%_0.08_75)] dark:hover:bg-[oklch(76%_0.13_85)]"
          onClick={() => record("converted")}
          disabled={pending !== null}
          aria-label="Converted"
        >
          <Sparkle weight="fill" className="size-4 mr-2" />
          Converted 🎉
        </Button>
      </footer>
    </motion.div>
  );
}
