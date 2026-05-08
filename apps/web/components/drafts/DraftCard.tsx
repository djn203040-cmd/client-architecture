"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  PencilSimple,
  CheckCircle,
  SkipForward,
  PauseCircle,
} from "@phosphor-icons/react";
import { InlineDraftEditor } from "./InlineDraftEditor";
import { toast } from "sonner";
import type { Database } from "@client/database";

type DraftRow = Database["public"]["Tables"]["drafts"]["Row"] & {
  leads: { name: string } | null;
};

export function DraftCard({
  draft,
  onAdvance,
}: {
  draft: DraftRow;
  onAdvance: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cardRef.current?.focus();
  }, [draft.id]);

  async function setStatus(status: "approved" | "held", body?: string) {
    const r = await fetch(`/api/drafts/${draft.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, ...(body ? { body } : {}) }),
    });
    if (!r.ok) {
      toast.error("This action didn't go through. Refresh and try again.");
      return;
    }
    toast.success(status === "approved" ? "Approved" : "Held");
    onAdvance();
  }

  function skip() {
    onAdvance();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (editing) return;
    if (e.key === "a" || e.key === "A") {
      e.preventDefault();
      setStatus("approved");
    }
    if (e.key === "s" || e.key === "S") {
      e.preventDefault();
      skip();
    }
    if (e.key === "h" || e.key === "H") {
      e.preventDefault();
      setStatus("held");
    }
    if (e.key === "Escape") {
      (e.target as HTMLElement).blur();
    }
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

  const sched = new Date(draft.scheduled_send_at ?? Date.now());

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
      className="rounded-2xl backdrop-blur-md bg-card dark:bg-white/5 border border-border dark:border-white/10 p-6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold leading-[1.25]">
            {draft.leads?.name ?? "Unknown lead"}
          </h2>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Message {draft.touchpoint_index} of {draft.total_touchpoints ?? "?"} &middot;{" "}
            {sched.toLocaleString()}
          </p>
          {draft.confidence_level === "low" && (
            <span className="inline-block mt-2 text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
              Low voice confidence
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditing(true)}
          aria-label="Edit draft"
          className="min-h-[44px] min-w-[44px]"
        >
          <PencilSimple weight="regular" className="size-4" />
        </Button>
      </header>

      {draft.subject && (
        <p className="text-sm font-medium mt-4">Subject: {draft.subject}</p>
      )}
      <p className="mt-4 whitespace-pre-wrap text-sm leading-[1.5] max-w-[65ch]">
        {draft.body}
      </p>

      <footer className="flex items-center gap-3 mt-6">
        <Button className="min-h-[44px]" onClick={() => setStatus("approved")}>
          <CheckCircle weight="regular" className="size-4 mr-2" />
          Approve <KeyBadge k="A" />
        </Button>
        <Button className="min-h-[44px]" variant="outline" onClick={skip}>
          <SkipForward weight="regular" className="size-4 mr-2" />
          Skip <KeyBadge k="S" />
        </Button>
        <Button className="min-h-[44px]" variant="outline" onClick={() => setStatus("held")}>
          <PauseCircle weight="regular" className="size-4 mr-2" />
          Hold <KeyBadge k="H" />
        </Button>
      </footer>
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
