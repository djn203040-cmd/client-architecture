"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowsClockwise, X, WarningCircle } from "@phosphor-icons/react";
import type { TVoiceProfile } from "@client/shared/validators";

function ChipRow({
  items,
  onRemove,
  onAdd,
  destructive = false,
}: {
  items: string[];
  onRemove: (i: number) => void;
  onAdd: (phrase: string) => void;
  destructive?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function commit() {
    const trimmed = draft.trim();
    if (trimmed) onAdd(trimmed);
    setDraft("");
    setAdding(false);
  }

  const chipClass = destructive
    ? "flex items-center gap-1 rounded-full px-3 py-1 text-sm bg-destructive/10 border border-destructive/30 text-destructive/80"
    : "flex items-center gap-1 rounded-full px-3 py-1 text-sm bg-card border border-border text-foreground";

  return (
    <ul className="flex flex-wrap gap-2 items-center list-none p-0 m-0">
      {items.map((item, i) => (
        <li key={i} className={chipClass}>
          {item}
          <button
            onClick={() => onRemove(i)}
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] -my-3 -mr-2 hover:text-destructive transition-colors"
            aria-label={`Remove "${item}"`}
          >
            <X weight="regular" className="size-4" />
          </button>
        </li>
      ))}
      {adding ? (
        <input
          autoFocus
          aria-label="New phrase"
          className="rounded-full px-3 py-1 text-sm border border-border bg-background outline-none focus:ring-1 focus:ring-primary-soft w-32"
          placeholder="Add phrase..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { setDraft(""); setAdding(false); }
          }}
          onBlur={commit}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Add phrase"
        >
          +
        </button>
      )}
    </ul>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-sm bg-card border border-border text-foreground capitalize">
      {label}
    </span>
  );
}

export function VoiceProfileCard({
  profile,
  onChange,
  onReanalyze,
}: {
  profile: TVoiceProfile;
  onChange: (updated: TVoiceProfile) => void;
  onReanalyze: () => void;
}) {
  function update<K extends keyof TVoiceProfile>(key: K, value: TVoiceProfile[K]) {
    onChange({ ...profile, [key]: value });
  }

  function removeFrom(key: "tone_adjectives" | "opener_phrases" | "closer_phrases" | "never_say_list", i: number) {
    const arr = [...profile[key]];
    arr.splice(i, 1);
    update(key, arr);
  }

  function addTo(key: "tone_adjectives" | "opener_phrases" | "closer_phrases" | "never_say_list", phrase: string) {
    update(key, [...profile[key], phrase]);
  }

  const lowExamples = profile.selected_examples.length < 8;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-5">
        <header className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Writing Style</h2>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            onClick={onReanalyze}
            aria-label="Re-analyze"
          >
            <ArrowsClockwise weight="regular" className="size-4" />
          </Button>
        </header>

        <div className="space-y-1">
          <h3 className="text-sm font-bold">How you sound</h3>
          <ChipRow
            items={profile.tone_adjectives}
            onRemove={(i) => removeFrom("tone_adjectives", i)}
            onAdd={(p) => addTo("tone_adjectives", p)}
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Formality</p>
            <Badge label={profile.formality_level} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Sentences</p>
            <Badge label={profile.sentence_length} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Emoji use</p>
            <Badge label={profile.emoji_usage} />
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-bold">How you start</h3>
          <ChipRow
            items={profile.opener_phrases}
            onRemove={(i) => removeFrom("opener_phrases", i)}
            onAdd={(p) => addTo("opener_phrases", p)}
          />
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-bold">How you finish</h3>
          <ChipRow
            items={profile.closer_phrases}
            onRemove={(i) => removeFrom("closer_phrases", i)}
            onAdd={(p) => addTo("closer_phrases", p)}
          />
        </div>

        <div className="bg-destructive/5 dark:bg-destructive/8 border border-destructive/20 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-bold text-destructive/70">Words I never use</h3>
          <ChipRow
            items={profile.never_say_list}
            onRemove={(i) => removeFrom("never_say_list", i)}
            onAdd={(p) => addTo("never_say_list", p)}
            destructive
          />
        </div>
      </div>

      {lowExamples && (
        <div
          role="alert"
          className="rounded-xl px-4 py-3 flex items-center gap-2 text-sm bg-accent/15 text-accent border border-accent/30"
        >
          <WarningCircle weight="regular" className="size-3.5 shrink-0" />
          Voice model needs more examples to be reliable. Add messages above and re-analyze.
        </div>
      )}
    </div>
  );
}
