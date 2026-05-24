"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Plus,
  ArrowsClockwise,
  ArrowsOutSimple,
  ArrowsInSimple,
  CaretDown,
  CaretUp,
  Trash,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const COLLAPSED_HEIGHT = "h-[200px]";

interface StoredTranscript {
  id: string;
  content: string;
  created_at: string;
}

export function ManualTranscriptUpload({
  leadId,
  latestTranscript,
  priorTranscripts = [],
}: {
  leadId: string;
  latestTranscript?: StoredTranscript | null;
  priorTranscripts?: StoredTranscript[];
}) {
  const router = useRouter();
  const existingContent = latestTranscript?.content ?? null;
  const [content, setContent] = useState(existingContent ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!existingContent);
  const [replacing, setReplacing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const pendingDelete =
    pendingDeleteId === latestTranscript?.id
      ? latestTranscript
      : priorTranscripts.find((t) => t.id === pendingDeleteId) ?? null;
  const isDeletingLatest = pendingDeleteId === latestTranscript?.id;

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/transcripts/${pendingDeleteId}`, { method: "DELETE" });
      if (!r.ok) {
        toast.error("Couldn't delete the transcript. Try again.");
        return;
      }
      toast.success("Transcript deleted");
      setPendingDeleteId(null);
      // If we just deleted the currently-loaded latest, drop our local content too
      // so the page refresh shows the next-most-recent (or the empty state).
      if (isDeletingLatest) {
        setContent("");
        setSaved(false);
        setReplacing(false);
      }
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => setContent(String(e.target?.result ?? ""));
    reader.readAsText(file);
  }

  async function save() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const r = await fetch("/api/transcripts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId, content }),
      });
      if (r.ok) {
        setSaved(true);
        setReplacing(false);
        setExpanded(false);
        router.refresh();
      } else {
        toast.error("Couldn't save the transcript. Try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  const deleteDialog = (
    <Dialog open={pendingDeleteId !== null} onOpenChange={(o) => !o && setPendingDeleteId(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Delete {isDeletingLatest ? "the latest" : "this"} transcript?
          </DialogTitle>
          <DialogDescription>
            {pendingDelete
              ? `This permanently removes the transcript from ${formatDate(pendingDelete.created_at)}. ${
                  isDeletingLatest && priorTranscripts.length > 0
                    ? "The next-most-recent call will become the latest and drive future drafts."
                    : isDeletingLatest
                      ? "No transcripts will remain on this lead."
                      : "Drafts will not be affected — they already use the latest call."
                } This cannot be undone.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setPendingDeleteId(null)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete transcript"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (saved && !replacing) {
    return (
      <>
      <section className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">Call Transcript</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest call{priorTranscripts.length > 0 ? ` · ${priorTranscripts.length + 1} total on file` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <>
                  <ArrowsInSimple weight="regular" className="size-3.5" />
                  Collapse
                </>
              ) : (
                <>
                  <ArrowsOutSimple weight="regular" className="size-3.5" />
                  Expand
                </>
              )}
            </Button>
            {latestTranscript && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5 text-muted-foreground hover:text-destructive"
                onClick={() => setPendingDeleteId(latestTranscript.id)}
                aria-label="Delete latest transcript"
              >
                <Trash weight="regular" className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div
          className={`text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed rounded-md bg-black/10 dark:bg-white/5 border border-white/5 p-3 ${
            expanded ? "" : `${COLLAPSED_HEIGHT} overflow-y-auto`
          }`}
        >
          {content}
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">
            Drafts use this latest call. Earlier calls stay on file for recap-style follow-ups.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-sm"
            onClick={() => {
              setContent("");
              setReplacing(true);
              setExpanded(false);
            }}
          >
            <Plus weight="regular" className="size-4" />
            Add new call
          </Button>
        </div>
        {priorTranscripts.length > 0 && (
          <div className="pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <span>
                {historyOpen ? "Hide" : "Show"} {priorTranscripts.length} earlier{" "}
                {priorTranscripts.length === 1 ? "call" : "calls"}
              </span>
              {historyOpen ? (
                <CaretUp weight="regular" className="size-3.5" />
              ) : (
                <CaretDown weight="regular" className="size-3.5" />
              )}
            </button>
            {/* fragment below holds the per-row delete confirmation */}
            {historyOpen && (
              <ul className="space-y-2 mt-2">
                {priorTranscripts.map((t) => {
                  const isOpen = expandedHistoryId === t.id;
                  return (
                    <li
                      key={t.id}
                      className="rounded-md bg-black/10 dark:bg-white/5 border border-white/5 overflow-hidden"
                    >
                      <div className="flex items-center gap-1 px-3 py-2 hover:bg-white/5 transition-colors">
                        <button
                          type="button"
                          onClick={() => setExpandedHistoryId(isOpen ? null : t.id)}
                          className="flex-1 flex items-center justify-between text-xs"
                        >
                          <span className="text-muted-foreground">
                            {formatDate(t.created_at)}
                          </span>
                          {isOpen ? (
                            <CaretUp weight="regular" className="size-3.5 text-muted-foreground" />
                          ) : (
                            <CaretDown weight="regular" className="size-3.5 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(t.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          aria-label={`Delete transcript from ${formatDate(t.created_at)}`}
                        >
                          <Trash weight="regular" className="size-3.5" />
                        </button>
                      </div>
                      {isOpen && (
                        <div className="px-3 pb-3 text-xs whitespace-pre-wrap font-mono leading-relaxed h-[180px] overflow-y-auto">
                          {t.content}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </section>
      {deleteDialog}
      </>
    );
  }

  return (
    <>
    <section className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold" id="transcript-upload-heading">Call Transcript</h2>
        {content.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <>
                <ArrowsInSimple weight="regular" className="size-3.5" />
                Collapse
              </>
            ) : (
              <>
                <ArrowsOutSimple weight="regular" className="size-3.5" />
                Expand
              </>
            )}
          </Button>
        )}
      </div>
      <Textarea
        id="transcript-content"
        aria-labelledby="transcript-upload-heading"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste transcript text or upload a .txt file..."
        style={{ fieldSizing: "fixed" } as React.CSSProperties}
        className={`text-sm font-mono resize-none ${expanded ? "min-h-[400px]" : COLLAPSED_HEIGHT}`}
        disabled={saving}
      />
      <div className="flex items-center gap-3 flex-wrap">
        {replacing && (
          <Button
            variant="ghost"
            size="sm"
            className="text-sm text-muted-foreground"
            disabled={saving}
            onClick={() => {
              setContent(existingContent ?? "");
              setReplacing(false);
              setExpanded(false);
            }}
          >
            Cancel
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-sm"
          disabled={saving}
          onClick={() => fileRef.current?.click()}
        >
          <Upload weight="regular" className="size-4" />
          Upload .txt file
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <Button
          size="sm"
          className="text-sm"
          disabled={!content.trim() || saving}
          onClick={save}
        >
          {saving ? (
            <>
              <ArrowsClockwise weight="regular" className="size-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            "Save transcript"
          )}
        </Button>
      </div>
    </section>
    {deleteDialog}
    </>
  );
}
