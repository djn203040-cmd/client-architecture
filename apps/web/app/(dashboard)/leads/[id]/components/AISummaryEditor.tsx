"use client";
import { useState, useReducer } from "react";
import { LockSimple } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  leadId: string;
  initialSummary: string;
  protected: boolean;
}

export function AISummaryEditor({ leadId, initialSummary, protected: isProtected }: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialSummary);
  const [saving, setSaving] = useReducer(() => true, false);

  async function handleSave() {
    setSaving();
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ai_summary: draft, ai_summary_protected: true }),
      });
      if (!res.ok) throw new Error();
      setSummary(draft);
      setEditing(false);
    } catch {
      toast.error("Couldn't save your edits. Try again.");
    }
  }

  function handleCancel() {
    setDraft(summary);
    setEditing(false);
  }

  if (!summary) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          className="text-sm leading-relaxed resize-none"
          aria-label="Edit AI lead description"
        />
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="min-h-[44px]"
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => { setDraft(summary); setEditing(true); }}
        className="text-sm leading-[1.5] text-foreground max-w-[65ch] text-left hover:bg-muted/40 rounded-md px-1 -mx-1 py-0.5 transition-colors w-full"
        aria-label="Click to edit AI lead description"
      >
        {summary}
      </button>
      <p className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
        {isProtected ? (
          <>
            <LockSimple size={12} aria-hidden="true" />
            Edited by you
          </>
        ) : (
          "AI-written"
        )}
      </p>
    </div>
  );
}
