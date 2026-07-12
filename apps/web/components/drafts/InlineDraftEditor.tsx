"use client";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ApproveButton } from "@/components/ui/approve-button";
import { useDictionary } from "@/lib/i18n/provider";
import type { Database } from "@client/database";

type DraftRow = Database["public"]["Tables"]["drafts"]["Row"] & {
  leads: { name: string } | null;
};

export function InlineDraftEditor({
  draft,
  onCancel,
  onSaveAndApprove,
}: {
  draft: DraftRow;
  onCancel: () => void;
  onSaveAndApprove: (body: string) => void;
}) {
  const t = useDictionary();
  const [body, setBody] = useState(draft.body);

  return (
    <div className="rounded-2xl backdrop-blur-md bg-card dark:bg-white/5 border border-border dark:border-white/10 p-6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <header className="mb-4">
        <h2 className="text-xl font-semibold">{draft.leads?.name ?? t.drafts.editor.unknownLead}</h2>
        <p className="text-xs font-mono text-muted-foreground">{t.drafts.editor.editing}</p>
      </header>
      {draft.subject && (
        <p className="text-sm font-medium mb-2">{t.drafts.editor.subject(draft.subject)}</p>
      )}
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={Math.max(8, body.split("\n").length + 2)}
        className="font-mono max-w-[65ch] w-full"
        aria-label={t.drafts.editor.bodyAria}
      />
      <footer className="flex items-center gap-3 mt-4">
        <ApproveButton className="min-h-[44px]" onClick={() => onSaveAndApprove(body)}>{t.drafts.editor.saveAndApprove}</ApproveButton>
        <Button className="min-h-[44px]" variant="outline" onClick={onCancel}>
          {t.drafts.editor.cancel}
        </Button>
      </footer>
    </div>
  );
}
