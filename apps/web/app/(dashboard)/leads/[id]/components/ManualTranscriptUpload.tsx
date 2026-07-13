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
import { useDictionary, useLocale } from "@/lib/i18n/provider";
import { toDateLocale } from "@/lib/format/datetime";

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
  const t = useDictionary();
  const dateLocale = toDateLocale(useLocale());
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
        toast.error(t.leads.transcript.deleteError);
        return;
      }
      toast.success(t.leads.transcript.deleted);
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
    return new Date(iso).toLocaleDateString(dateLocale, {
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
        toast.error(t.leads.transcript.saveError);
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
            {isDeletingLatest
              ? t.leads.transcript.deleteTitleLatest
              : t.leads.transcript.deleteTitleThis}
          </DialogTitle>
          <DialogDescription>
            {pendingDelete
              ? t.leads.transcript.deleteBody(formatDate(pendingDelete.created_at), {
                  isLatest: isDeletingLatest,
                  hasPrior: priorTranscripts.length > 0,
                })
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setPendingDeleteId(null)}
            disabled={deleting}
          >
            {t.leads.transcript.deleteCancel}
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
            {deleting ? t.leads.transcript.deleting : t.leads.transcript.deleteConfirm}
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
            <h2 className="text-xl font-semibold">{t.leads.transcript.heading}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.leads.transcript.latestCall}
              {priorTranscripts.length > 0
                ? t.leads.transcript.totalOnFile(priorTranscripts.length + 1)
                : ""}
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
                aria-label={t.leads.transcript.deleteLatestAria}
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
            {t.leads.transcript.usesLatest}
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
            {t.leads.transcript.addNewCall}
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
                {historyOpen
                  ? t.leads.transcript.hideEarlier(priorTranscripts.length)
                  : t.leads.transcript.showEarlier(priorTranscripts.length)}
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
                {priorTranscripts.map((tr) => {
                  const isOpen = expandedHistoryId === tr.id;
                  return (
                    <li
                      key={tr.id}
                      className="rounded-md bg-black/10 dark:bg-white/5 border border-white/5 overflow-hidden"
                    >
                      <div className="flex items-center gap-1 px-3 py-2 hover:bg-white/5 transition-colors">
                        <button
                          type="button"
                          onClick={() => setExpandedHistoryId(isOpen ? null : tr.id)}
                          className="flex-1 flex items-center justify-between text-xs"
                        >
                          <span className="text-muted-foreground">
                            {formatDate(tr.created_at)}
                          </span>
                          {isOpen ? (
                            <CaretUp weight="regular" className="size-3.5 text-muted-foreground" />
                          ) : (
                            <CaretDown weight="regular" className="size-3.5 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(tr.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          aria-label={t.leads.transcript.deleteRowAria(formatDate(tr.created_at))}
                        >
                          <Trash weight="regular" className="size-3.5" />
                        </button>
                      </div>
                      {isOpen && (
                        <div className="px-3 pb-3 text-xs whitespace-pre-wrap font-mono leading-relaxed h-[180px] overflow-y-auto">
                          {tr.content}
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
        <h2 className="text-xl font-semibold" id="transcript-upload-heading">{t.leads.transcript.heading}</h2>
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
                {t.leads.transcript.collapse}
              </>
            ) : (
              <>
                <ArrowsOutSimple weight="regular" className="size-3.5" />
                {t.leads.transcript.expand}
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
        placeholder={t.leads.transcript.placeholder}
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
            {t.leads.transcript.cancel}
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
          {t.leads.transcript.uploadTxt}
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
              {t.leads.transcript.saving}
            </>
          ) : (
            t.leads.transcript.save
          )}
        </Button>
      </div>
    </section>
    {deleteDialog}
    </>
  );
}
