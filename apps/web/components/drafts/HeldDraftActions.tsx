"use client";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ApproveButton } from "@/components/ui/approve-button";
import { PaperPlaneTilt, PencilSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { InlineDraftEditor } from "./InlineDraftEditor";
import { useDictionary } from "@/lib/i18n/provider";
import type { Database } from "@client/database";

type DraftRow = Database["public"]["Tables"]["drafts"]["Row"] & {
  leads: { name: string } | null;
};

interface Props {
  draft: DraftRow;
  onAdvance?: () => void;
}

export function HeldDraftActions({ draft, onAdvance }: Props) {
  const t = useDictionary();
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
        toast.error(t.drafts.heldActions.approveFailed(reason));
        return;
      }
      const sentAt = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      toast.success(t.drafts.heldActions.sentAt(sentAt));
      onAdvance?.();
    } finally {
      setBusy(false);
    }
  }, [draft.id, onAdvance, t]);

  const cancel = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!r.ok) {
        toast.error(t.drafts.heldActions.cancelFailed);
        return;
      }
      toast.success(t.drafts.heldActions.cancelledToast);
      onAdvance?.();
    } finally {
      setBusy(false);
      setConfirmingCancel(false);
    }
  }, [draft.id, onAdvance, t]);

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
          // Body-only save for held drafts, do not approve
          const r = await fetch(`/api/drafts/${draft.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ body }),
          });
          if (!r.ok) {
            toast.error(t.drafts.heldActions.saveFailed);
            return;
          }
          toast.success(t.drafts.heldActions.savedToast);
          setEditing(false);
          onAdvance?.();
        }}
      />
    );
  }

  if (confirmingCancel) {
    return (
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
        <span className="text-sm text-foreground">{t.drafts.heldActions.confirmCancel}</span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmingCancel(false)}
            disabled={busy}
          >
            {t.drafts.heldActions.keepOnHold}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={cancel}
            disabled={busy}
          >
            {t.drafts.heldActions.yesCancel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
      <ApproveButton onClick={reapprove} disabled={busy} className="min-h-[44px]">
        <PaperPlaneTilt className="size-4 mr-2" weight="regular" />
        {t.drafts.heldActions.reapprove}
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
          {t.drafts.heldActions.edit}
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
          {t.drafts.heldActions.cancel}
          <span className="ml-2 text-xs font-mono text-muted-foreground/60 hidden md:inline">
            C
          </span>
        </Button>
      </div>
    </div>
  );
}
