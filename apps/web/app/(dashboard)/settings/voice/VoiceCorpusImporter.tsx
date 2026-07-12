"use client";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowsClockwise, ArrowsIn, ArrowsOut, ArrowCounterClockwise, CalendarBlank, Funnel, Upload, User } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useDictionary } from "@/lib/i18n/provider";
import type { TVoiceProfile } from "@client/shared/validators";
import {
  detectSpeakers,
  filterCorpus,
  hasTimestamps,
  previewFilter,
  type Channel,
} from "@/lib/voice/parse-speakers";

type Corpus = { gmail: string; linkedin: string; instagram: string; whatsapp: string };

const CHANNELS = [
  { key: "gmail" as const, accept: ".txt", acceptLabel: ".txt" },
  { key: "linkedin" as const, accept: ".csv,.txt", acceptLabel: ".csv" },
  { key: "instagram" as const, accept: ".json,.txt", acceptLabel: ".json" },
  { key: "whatsapp" as const, accept: ".txt", acceptLabel: ".txt" },
];

type DateWindow = "3m" | "6m" | "12m" | "24m" | "all";

const DATE_WINDOWS: { value: DateWindow; months: number | null }[] = [
  { value: "3m", months: 3 },
  { value: "6m", months: 6 },
  { value: "12m", months: 12 },
  { value: "24m", months: 24 },
  { value: "all", months: null },
];

function windowToDate(win: DateWindow): Date | undefined {
  const found = DATE_WINDOWS.find((w) => w.value === win);
  if (!found || found.months === null) return undefined;
  const d = new Date();
  d.setMonth(d.getMonth() - found.months);
  return d;
}

type CorpusImporterCopy = ReturnType<typeof useDictionary>["settingsAdvanced"]["voice"]["corpusImporter"];

function channelLabel(copy: CorpusImporterCopy, key: keyof Corpus): string {
  switch (key) {
    case "gmail": return copy.gmailLabel;
    case "linkedin": return copy.linkedinLabel;
    case "instagram": return copy.instagramLabel;
    case "whatsapp": return copy.whatsappLabel;
  }
}

function channelPlaceholder(copy: CorpusImporterCopy, key: keyof Corpus): string {
  switch (key) {
    case "gmail": return copy.gmailPlaceholder;
    case "linkedin": return copy.linkedinPlaceholder;
    case "instagram": return copy.instagramPlaceholder;
    case "whatsapp": return copy.whatsappPlaceholder;
  }
}

function windowLabel(copy: CorpusImporterCopy, win: DateWindow): string {
  switch (win) {
    case "3m": return copy.last3Months;
    case "6m": return copy.last6Months;
    case "12m": return copy.last12Months;
    case "24m": return copy.last24Months;
    case "all": return copy.allTime;
  }
}

export function VoiceCorpusImporter({
  onAnalyzed,
  onAnalyzing,
  isAnalyzing,
}: {
  onAnalyzed: (profile: TVoiceProfile) => void;
  onAnalyzing: () => void;
  isAnalyzing: boolean;
}) {
  const t = useDictionary();
  const copy = t.settingsAdvanced.voice.corpusImporter;
  const [corpus, setCorpus] = useState<Corpus>({ gmail: "", linkedin: "", instagram: "", whatsapp: "" });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [preFilter, setPreFilter] = useState<Partial<Record<keyof Corpus, string>>>({});
  const [selfNames, setSelfNames] = useState<Record<keyof Corpus, string[]>>({
    gmail: [], linkedin: [], instagram: [], whatsapp: [],
  });
  const [dateWindow, setDateWindow] = useState<Record<keyof Corpus, DateWindow>>({
    gmail: "12m", linkedin: "12m", instagram: "12m", whatsapp: "12m",
  });
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const hasContent = Object.values(corpus).some((v) => v.trim().length > 0);

  function setChannel(key: keyof Corpus, value: string) {
    setCorpus((prev) => ({ ...prev, [key]: value }));
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleSelf(channel: keyof Corpus, name: string) {
    setSelfNames((prev) => {
      const current = prev[channel];
      const next = current.includes(name) ? current.filter((n) => n !== name) : [...current, name];
      return { ...prev, [channel]: next };
    });
  }

  function setWindow(channel: keyof Corpus, win: DateWindow) {
    setDateWindow((prev) => ({ ...prev, [channel]: win }));
  }

  function applyFilter(channel: keyof Corpus) {
    const text = corpus[channel];
    if (!text.trim()) return;
    const filtered = filterCorpus(channel as Channel, text, {
      selfNames: selfNames[channel],
      sinceDate: windowToDate(dateWindow[channel]),
    });
    if (!filtered.trim()) {
      import("sonner").then(({ toast }) => {
        toast.error(copy.noFilterMatch);
      });
      return;
    }
    setPreFilter((prev) => ({ ...prev, [channel]: text }));
    setChannel(channel, filtered);
  }

  function restoreOriginal(channel: keyof Corpus) {
    const original = preFilter[channel];
    if (typeof original !== "string") return;
    setChannel(channel, original);
    setPreFilter((prev) => {
      const next = { ...prev };
      delete next[channel];
      return next;
    });
  }

  async function handleFileUpload(key: keyof Corpus, files: FileList) {
    const readFile = (file: File) =>
      new Promise<{ name: string; text: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ name: file.name, text: String(e.target?.result ?? "") });
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });

    try {
      const results = await Promise.all(Array.from(files).map(readFile));
      const appended = results
        .map(({ name, text }) => `--- ${name} ---\n${text.trim()}`)
        .join("\n\n");
      setCorpus((prev) => {
        const existing = prev[key].trim();
        const next = existing.length > 0 ? `${existing}\n\n${appended}` : appended;
        return { ...prev, [key]: next };
      });
      setPreFilter((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch {
      import("sonner").then(({ toast }) => {
        toast.error(copy.fileReadFailed);
      });
    }
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
        throw new Error((data as { error?: string }).error ?? copy.analysisFailed);
      }
      const profile = await r.json();
      onAnalyzed(profile);
    } catch (err) {
      import("sonner").then(({ toast }) => {
        toast.error(err instanceof Error ? err.message : copy.analyzeError);
      });
    }
  }

  return (
    <div className="space-y-4">
      {CHANNELS.map(({ key, accept, acceptLabel }) => {
        const isExpanded = Boolean(expanded[key]);
        return (
          <ChannelCard
            key={key}
            channel={key}
            label={channelLabel(copy, key)}
            placeholder={channelPlaceholder(copy, key)}
            accept={accept}
            acceptLabel={acceptLabel}
            value={corpus[key]}
            isExpanded={isExpanded}
            isAnalyzing={isAnalyzing}
            selfNames={selfNames[key]}
            dateWindow={dateWindow[key]}
            isFiltered={key in preFilter}
            onToggleExpanded={() => toggleExpanded(key)}
            onChange={(v) => setChannel(key, v)}
            onToggleSelf={(name) => toggleSelf(key, name)}
            onSetWindow={(w) => setWindow(key, w)}
            onApplyFilter={() => applyFilter(key)}
            onRestoreOriginal={() => restoreOriginal(key)}
            onPickFile={() => fileRefs.current[key]?.click()}
            fileInputRef={(el) => { fileRefs.current[key] = el; }}
            onFileChange={(files) => { if (files && files.length > 0) void handleFileUpload(key, files); }}
          />
        );
      })}

      {hasContent && (
        <div className="space-y-2">
          <Button
            className="min-h-[44px] w-full sm:w-auto gap-2"
            onClick={analyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <ArrowsClockwise weight="regular" className="size-4 animate-spin" />
                {copy.analyzing}
              </>
            ) : (
              copy.analyzeMyWriting
            )}
          </Button>
          {isAnalyzing && (
            <p className="text-xs text-muted-foreground leading-relaxed" role="status">
              {copy.analyzeHint}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

type ChannelCardProps = {
  channel: keyof Corpus;
  label: string;
  placeholder: string;
  accept: string;
  acceptLabel: string;
  value: string;
  isExpanded: boolean;
  isAnalyzing: boolean;
  selfNames: string[];
  dateWindow: DateWindow;
  isFiltered: boolean;
  onToggleExpanded: () => void;
  onChange: (v: string) => void;
  onToggleSelf: (name: string) => void;
  onSetWindow: (w: DateWindow) => void;
  onApplyFilter: () => void;
  onRestoreOriginal: () => void;
  onPickFile: () => void;
  fileInputRef: (el: HTMLInputElement | null) => void;
  onFileChange: (files: FileList | null) => void;
};

function ChannelCard(props: ChannelCardProps) {
  const {
    channel, label, placeholder, accept, acceptLabel, value, isExpanded, isAnalyzing,
    selfNames, dateWindow, isFiltered, onToggleExpanded, onChange, onToggleSelf,
    onSetWindow, onApplyFilter, onRestoreOriginal, onPickFile, fileInputRef, onFileChange,
  } = props;
  const t = useDictionary();
  const copy = t.settingsAdvanced.voice.corpusImporter;

  const speakers = useMemo(() => detectSpeakers(channel, value), [channel, value]);
  const datesPresent = useMemo(() => hasTimestamps(channel, value), [channel, value]);

  const showSpeakers = !isFiltered && speakers.length >= 2;
  const showDates = !isFiltered && datesPresent;
  const showRefinePanel = showSpeakers || showDates;

  const preview = useMemo(() => {
    if (!showRefinePanel) return null;
    return previewFilter(channel, value, {
      selfNames,
      sinceDate: windowToDate(dateWindow),
    });
  }, [showRefinePanel, channel, value, selfNames, dateWindow]);

  return (
    <div className="rounded-2xl bg-card border border-border p-6 space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor={`corpus-${channel}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </label>
        <button
          type="button"
          onClick={onToggleExpanded}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label={isExpanded ? copy.collapseField(label) : copy.expandField(label)}
          aria-pressed={isExpanded}
        >
          {isExpanded ? (
            <ArrowsIn weight="regular" className="size-3.5" />
          ) : (
            <ArrowsOut weight="regular" className="size-3.5" />
          )}
          {isExpanded ? copy.collapse : copy.expand}
        </button>
      </div>

      {showRefinePanel && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-3">
          {showSpeakers && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                <User weight="regular" className="size-3.5" />
                {copy.speakersFound(speakers.length)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {speakers.map(({ name, count }) => {
                  const selected = selfNames.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => onToggleSelf(name)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors border",
                        selected
                          ? "bg-foreground text-background border-foreground"
                          : "bg-background text-foreground border-border hover:border-foreground/50",
                      )}
                      aria-pressed={selected}
                    >
                      <span className="font-medium">{name}</span>
                      <span className={cn("tabular-nums", selected ? "opacity-70" : "text-muted-foreground")}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showDates && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                <CalendarBlank weight="regular" className="size-3.5" />
                {copy.timeWindow}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DATE_WINDOWS.map(({ value: v }) => {
                  const selected = dateWindow === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => onSetWindow(v)}
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs transition-colors border",
                        selected
                          ? "bg-foreground text-background border-foreground"
                          : "bg-background text-foreground border-border hover:border-foreground/50",
                      )}
                      aria-pressed={selected}
                    >
                      {windowLabel(copy, v)}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {copy.timeWindowHint}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1 border-t border-amber-500/20">
            {preview && (
              <p className="text-xs text-muted-foreground tabular-nums">
                {copy.keepsSummary(
                  preview.keptCount.toLocaleString(),
                  preview.totalCount.toLocaleString(),
                  preview.keptChars.toLocaleString(),
                )}
              </p>
            )}
            <Button
              size="sm"
              variant="default"
              className="gap-1.5 h-8 text-xs shrink-0"
              onClick={onApplyFilter}
              disabled={isAnalyzing || (preview?.keptCount ?? 0) === 0}
            >
              <Funnel weight="regular" className="size-3.5" />
              {copy.applyFilter}
            </Button>
          </div>
        </div>
      )}

      {isFiltered && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center justify-between gap-2">
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            {selfNames.length > 0 ? copy.filteredTo(selfNames.join(", ")) : copy.filtered}
            {dateWindow !== "all" ? `, ${windowLabel(copy, dateWindow).toLowerCase()}` : ""}.
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 h-8 text-xs"
            onClick={onRestoreOriginal}
            disabled={isAnalyzing}
          >
            <ArrowCounterClockwise weight="regular" className="size-3.5" />
            {copy.restoreOriginal}
          </Button>
        </div>
      )}

      <Textarea
        id={`corpus-${channel}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "field-sizing-fixed resize-none overflow-y-auto text-sm font-mono",
          isExpanded ? "h-96" : "h-32",
        )}
        disabled={isAnalyzing}
      />
      {value.trim().length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {copy.chars(value.length.toLocaleString())}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[44px] gap-2 text-sm"
          disabled={isAnalyzing}
          onClick={onPickFile}
        >
          <Upload weight="regular" className="size-4" />
          {copy.uploadFiles(acceptLabel)}
        </Button>
        <span className="text-xs text-muted-foreground">
          {copy.uploadHint}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => {
            onFileChange(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
