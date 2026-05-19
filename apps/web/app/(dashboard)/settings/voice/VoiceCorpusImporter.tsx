"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowsClockwise, Upload } from "@phosphor-icons/react";
import type { TVoiceProfile } from "@client/shared/validators";

type Corpus = { gmail: string; linkedin: string; instagram: string; whatsapp: string };

const CHANNELS = [
  {
    key: "gmail" as const,
    label: "Gmail exports",
    placeholder: "Paste Gmail exports here — any emails you've written to leads or clients.",
  },
  {
    key: "linkedin" as const,
    label: "LinkedIn messages",
    placeholder: "Paste LinkedIn messages you've sent. Copy from your sent messages folder.",
  },
  {
    key: "instagram" as const,
    label: "Instagram DMs",
    placeholder: "Paste Instagram DMs you've written. Screenshot or copy text directly.",
  },
  {
    key: "whatsapp" as const,
    label: "WhatsApp messages",
    placeholder: "Paste WhatsApp messages from your .txt export.",
  },
];

export function VoiceCorpusImporter({
  onAnalyzed,
  onAnalyzing,
  isAnalyzing,
}: {
  onAnalyzed: (profile: TVoiceProfile) => void;
  onAnalyzing: () => void;
  isAnalyzing: boolean;
}) {
  const [corpus, setCorpus] = useState<Corpus>({ gmail: "", linkedin: "", instagram: "", whatsapp: "" });
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const hasContent = Object.values(corpus).some((v) => v.trim().length > 0);

  function setChannel(key: keyof Corpus, value: string) {
    setCorpus((prev) => ({ ...prev, [key]: value }));
  }

  function handleFileUpload(key: keyof Corpus, file: File) {
    const reader = new FileReader();
    reader.onload = (e) => setChannel(key, String(e.target?.result ?? ""));
    reader.readAsText(file);
  }

  async function analyze() {
    onAnalyzing();
    try {
      const r = await fetch("/api/voice/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ corpus }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Analysis failed");
      }
      const profile = await r.json();
      onAnalyzed(profile);
    } catch (err) {
      import("sonner").then(({ toast }) => {
        toast.error(err instanceof Error ? err.message : "Something went wrong analyzing your writing. Try again or add more content.");
      });
    }
  }

  return (
    <div className="space-y-4">
      {CHANNELS.map(({ key, label, placeholder }) => (
        <div key={key} className="rounded-2xl bg-card border border-border p-6 space-y-3">
          <label htmlFor={`corpus-${key}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </label>
          <Textarea
            id={`corpus-${key}`}
            value={corpus[key]}
            onChange={(e) => setChannel(key, e.target.value)}
            placeholder={placeholder}
            className="min-h-[128px] resize-y text-sm font-mono"
            disabled={isAnalyzing}
          />
          {corpus[key].trim().length > 0 && (
            <p className="text-xs text-muted-foreground text-right">
              {corpus[key].length.toLocaleString()} chars
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px] gap-2 text-sm"
              disabled={isAnalyzing}
              onClick={() => fileRefs.current[key]?.click()}
            >
              <Upload weight="regular" className="size-4" />
              Upload .txt file
            </Button>
            <input
              ref={(el) => { fileRefs.current[key] = el; }}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(key, file);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      ))}

      {hasContent && (
        <Button
          className="min-h-[44px] w-full sm:w-auto gap-2"
          onClick={analyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <ArrowsClockwise weight="regular" className="size-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Analyze my writing"
          )}
        </Button>
      )}
    </div>
  );
}
