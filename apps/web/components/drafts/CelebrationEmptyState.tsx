"use client";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@phosphor-icons/react";
import { useDictionary } from "@/lib/i18n/provider";

interface Props {
  stat?: { value: number; label: "responded" | "sent" } | "first-time";
}

function StatLine({ stat }: { stat: Props["stat"] }) {
  const t = useDictionary();
  if (stat === "first-time" || !stat) {
    return <p className="text-sm text-muted-foreground">{t.drafts.emptyState.queueClear}</p>;
  }
  if (stat.label === "responded") {
    return (
      <p className="text-sm text-muted-foreground">
        <span className="font-mono text-foreground">{stat.value}</span>{" "}
        {t.drafts.emptyState.responded(stat.value)}
      </p>
    );
  }
  return (
    <p className="text-sm text-muted-foreground">
      <span className="font-mono text-foreground">{stat.value}</span>{" "}
      {t.drafts.emptyState.sent(stat.value)}
    </p>
  );
}

export function CelebrationEmptyState({ stat }: Props) {
  const reduce = useReducedMotion();
  const t = useDictionary();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { y: 16, opacity: 0 }}
      animate={reduce ? { opacity: 1 } : { y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
      className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-12 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] max-w-[480px] mx-auto text-center space-y-6"
    >
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        className="mx-auto"
        aria-hidden="true"
      >
        <motion.path
          d="M16 33 L28 45 L48 21"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent"
          initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </svg>
      <h2 className="text-[28px] font-semibold leading-[1.2]">
        {t.drafts.emptyState.title}
      </h2>
      <StatLine stat={stat} />
      <Button asChild variant="ghost" className="min-h-[44px]">
        <Link href="/dashboard">
          <ArrowLeft className="size-4 mr-2" weight="regular" />
          {t.drafts.emptyState.backToDashboard}
        </Link>
      </Button>
    </motion.div>
  );
}
