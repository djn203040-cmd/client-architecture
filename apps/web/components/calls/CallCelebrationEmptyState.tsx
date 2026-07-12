"use client";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PhoneCall } from "@phosphor-icons/react";

interface Props {
  /** Tailors the line under the headline to the empty tab. */
  bucket?: "awaiting" | "upcoming" | "history";
}

const LINE: Record<NonNullable<Props["bucket"]>, string> = {
  awaiting: "Every call is accounted for",
  upcoming: "No calls on the calendar yet",
  history: "Resolved calls will appear here",
};

/**
 * Calls-queue empty state, a quiet celebration rather than a dead-end, mirroring
 * the drafts {@link CelebrationEmptyState}. The Awaiting tab reaching zero means
 * the coach has triaged everything, so the tone is congratulatory.
 */
export function CallCelebrationEmptyState({ bucket = "awaiting" }: Props) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { y: 16, opacity: 0 }}
      animate={reduce ? { opacity: 1 } : { y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
      className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-12 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] max-w-[480px] mx-auto text-center space-y-6"
    >
      <span
        className="mx-auto flex size-16 items-center justify-center rounded-full bg-[oklch(80%_0.14_85)]/20 text-[oklch(55%_0.13_80)] dark:text-[oklch(80%_0.14_85)]"
        aria-hidden="true"
      >
        <PhoneCall weight="regular" className="size-7" />
      </span>
      <h2 className="text-[28px] font-semibold leading-[1.2]">
        {bucket === "awaiting" ? "You're all caught up." : "Nothing here yet."}
      </h2>
      <p className="text-sm text-muted-foreground">{LINE[bucket]}</p>
      <Button asChild variant="ghost" className="min-h-[44px]">
        <Link href="/">
          <ArrowLeft className="size-4 mr-2" weight="regular" />
          Back to dashboard
        </Link>
      </Button>
    </motion.div>
  );
}

/** Skeleton placeholder while the realtime subscription warms up. */
export function CallQueueSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-2xl p-6 backdrop-blur-md bg-card dark:bg-white/5 border border-border dark:border-white/10"
        >
          <div className="h-5 w-2/3 rounded-md bg-muted animate-pulse" />
          <div className="mt-2 h-3 w-1/3 rounded-md bg-muted animate-pulse" />
          <div className="mt-6 flex gap-3">
            <div className="h-11 flex-1 rounded-md bg-muted animate-pulse" />
            <div className="h-11 flex-1 rounded-md bg-muted animate-pulse" />
            <div className="h-11 flex-1 rounded-md bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
