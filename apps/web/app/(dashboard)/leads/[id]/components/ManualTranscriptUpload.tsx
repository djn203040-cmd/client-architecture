"use client";
import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, ArrowsClockwise } from "@phosphor-icons/react";
import { toast } from "sonner";

export function ManualTranscriptUpload({
  leadId,
  existingContent,
}: {
  leadId: string;
  existingContent?: string | null;
}) {
  const [content, setContent] = useState(existingContent ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!existingContent);
  const [replacing, setReplacing] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

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
      } else {
        toast.error("Couldn't save the transcript. Try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (saved && !replacing) {
    return (
      <section className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-3">
        <h2 className="text-xl font-semibold">Call Transcript</h2>
        <p className="text-sm text-foreground line-clamp-3 max-w-[65ch]">
          {content.slice(0, 200)}
          {content.length > 200 ? "…" : ""}
        </p>
        <p className="text-xs text-muted-foreground">Saved. A draft will be generated shortly.</p>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[44px] gap-2 text-sm"
          onClick={() => setReplacing(true)}
        >
          <ArrowsClockwise weight="regular" className="size-4" />
          Replace transcript
        </Button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4">
      <h2 className="text-xl font-semibold" id="transcript-upload-heading">Call Transcript</h2>
      <Textarea
        id="transcript-content"
        aria-labelledby="transcript-upload-heading"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste transcript text or upload a .txt file..."
        className="min-h-[160px] resize-y text-sm font-mono"
        disabled={saving}
      />
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[44px] gap-2 text-sm"
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
          className="min-h-[44px] text-sm"
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
  );
}
