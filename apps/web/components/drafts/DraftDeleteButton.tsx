"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useDictionary } from "@/lib/i18n/provider";

interface Props {
  draftId: string;
  /** Called after a successful delete so the surface can drop the card. */
  onDeleted?: () => void;
}

/**
 * Deliberately low-emphasis, two-step delete, the operator's escape hatch for
 * junk drafts (e.g. a reply draft generated with no inbound to answer). Delete
 * is NOT a primary action: muted styling, tucked in a corner, no keyboard
 * shortcut, and gated behind an explicit confirm so it can't be hit by accident
 * next to Approve / Regenerate. It hard-deletes (DELETE /api/drafts/[id]),
 * unlike Hold/Cancel which only move status.
 */
export function DraftDeleteButton({ draftId, onDeleted }: Props) {
  const t = useDictionary();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function del() {
    setBusy(true);
    try {
      const r = await fetch(`/api/drafts/${draftId}`, { method: "DELETE" });
      if (!r.ok) {
        toast.error(t.drafts.deleteButton.deleteFailed);
        return;
      }
      toast.success(t.drafts.deleteButton.deletedToast);
      onDeleted?.();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">{t.drafts.deleteButton.confirm}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={busy}
        >
          {t.drafts.deleteButton.keep}
        </Button>
        <Button variant="destructive" size="sm" onClick={del} disabled={busy}>
          {t.drafts.deleteButton.delete}
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label={t.drafts.deleteButton.ariaLabel}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground/50 transition-colors hover:text-destructive focus-visible:text-destructive focus-visible:outline-none"
    >
      <Trash weight="regular" className="size-3.5" />
      {t.drafts.deleteButton.delete}
    </button>
  );
}
