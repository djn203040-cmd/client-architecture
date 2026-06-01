"use client";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ApproveButton } from "@/components/ui/approve-button";
import { PaperPlaneTilt, PencilSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { InlineDraftEditor } from "./InlineDraftEditor";
import type { Database } from "@client/database";

type DraftRow = Database["public"]["Tables"]["drafts"]["Row"] & {
  leads: { name: string } | null;
};

interface Props {
  draft: DraftRow;
  onAdvance?: () => void;
}

export function HeldDraftActions({ draft, onAdvance }: Props) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const reapprove = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!r.ok) {
        const { reason } = await r.json().catch(() => ({ reason: "unknown" }));
        toast.error(`Couldn't approve. ${reason}.`);
        return;
      }
      const sentAt = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      toast.success(`Approved. Sent at ${sentAt}.`);
      onAdvance?.();
    } finally {
      setBusy(false);
    }
  }, [draft.id, onAdvance]);

  const cancel = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!r.ok) {
        toast.error("Couldn't cancel. Try again.");
        return;
      }
      toast.success("Draft cancelled.");
      onAdvance?.();
    } finally {
      setBusy(false);
      setConfirmingCancel(false);
    }
  }, [draft.id, onAdvance]);

  // Keyboard shortcuts R / E / C
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editing || confirmingCancel) return;
      if (e.key === "r" || e.key === "R") { e.preventDefault(); void reapprove(); }
      if (e.key === "e" || e.key === "E") { e.preventDefault(); setEditing(true); }
      if (e.key === "c" || e.key === "C") { e.preventDefault(); setConfirmingCancel(true); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, confirmingCancel, reapprove]);

  if (editing) {
    return (
      <InlineDraftEditor
        draft={draft}
        onCancel={() => setEditing(false)}
        onSaveAndApprove={async (body) => {
          // Body-only save for held drafts — do not approve
          const r = await fetch(`/api/drafts/${draft.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ body }),
          });
          if (!r.ok) {
            toast.error("Save failed. Try again.");
            return;
          }
          toast.success("Draft saved.");
          setEditing(false);
          onAdvance?.();
        }}
      />
    );
  }

  if (confirmingCancel) {
    return (
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
        <span className="text-sm text-foreground">Cancel this draft?</span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmingCancel(false)}
            disabled={busy}
          >
            Keep on hold
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={cancel}
            disabled={busy}
          >
            Yes, cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
      <ApproveButton onClick={reapprove} disabled={busy} className="min-h-[44px]">
        <PaperPlaneTilt className="size-4 mr-2" weight="regular" />
        Re-approve
        <span className="ml-2 text-xs font-mono text-muted-foreground/60 hidden md:inline">
          R
        </span>
      </ApproveButton>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={() => setEditing(true)}
          disabled={busy}
          className="min-h-[44px]"
        >
          <PencilSimple className="size-4 mr-2" weight="regular" />
          Edit
          <span className="ml-2 text-xs font-mono text-muted-foreground/60 hidden md:inline">
            E
          </span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => setConfirmingCancel(true)}
          disabled={busy}
          className="min-h-[44px] hover:text-destructive"
        >
          Cancel
          <span className="ml-2 text-xs font-mono text-muted-foreground/60 hidden md:inline">
            C
          </span>
        </Button>
      </div>
    </div>
  );
}
