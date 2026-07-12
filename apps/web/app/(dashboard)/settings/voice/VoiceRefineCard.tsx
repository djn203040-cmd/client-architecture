"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkle, X, Check, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { TOUR_ANCHOR } from "@/lib/tour/anchors";
import type { TUsageRule } from "@client/shared/validators";

export function VoiceRefineCard({
  rules,
  onAddRule,
  onDeleteRule,
}: {
  rules: TUsageRule[];
  // Persists a single approved rule. Resolves true on success so the card can
  // clear it from the proposed list; false leaves it for another try.
  onAddRule: (rule: string) => Promise<boolean>;
  onDeleteRule: (index: number) => Promise<boolean>;
}) {
  const [draftBody, setDraftBody] = useState("");
  const [critique, setCritique] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [proposed, setProposed] = useState<string[] | null>(null);
  const [busyRule, setBusyRule] = useState<string | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  async function suggest() {
    if (!draftBody.trim() || !critique.trim()) return;
    setAnalyzing(true);
    setProposed(null);
    try {
      const r = await fetch("/api/voice/refine", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft_body: draftBody, critique }),
      });
      if (!r.ok) {
        const data = (await r.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "Couldn't read that draft. Try again.");
        return;
      }
      const data = (await r.json()) as { rules: string[] };
      setProposed(data.rules);
    } finally {
      setAnalyzing(false);
    }
  }

  async function add(rule: string) {
    setBusyRule(rule);
    try {
      const ok = await onAddRule(rule);
      if (ok) setProposed((p) => (p ? p.filter((x) => x !== rule) : p));
    } finally {
      setBusyRule(null);
    }
  }

  function editProposed(i: number, value: string) {
    setProposed((p) => (p ? p.map((r, idx) => (idx === i ? value : r)) : p));
  }

  function skip(i: number) {
    setProposed((p) => (p ? p.filter((_, idx) => idx !== i) : p));
  }

  async function remove(index: number) {
    setDeletingIndex(index);
    try {
      await onDeleteRule(index);
    } finally {
      setDeletingIndex(null);
    }
  }

  return (
    <div
      data-tour={TOUR_ANCHOR.settingsVoiceRefine}
      className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-5"
    >
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Fine-tune your voice</h2>
        <p className="text-sm text-muted-foreground max-w-[65ch]">
          Got a draft that didn&apos;t quite sound like you? Paste it below with a note on
          what felt off. We&apos;ll turn it into a small rule your future drafts follow.
        </p>
      </header>

      {rules.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold">Your rules</h3>
          <ul className="space-y-2 list-none p-0 m-0">
            {rules.map((r, i) => (
              <li
                key={`${r.added_at}-${i}`}
                className="flex items-start gap-2 rounded-xl bg-card border border-border px-3 py-2 text-sm"
              >
                <span className="flex-1">{r.rule}</span>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground pt-0.5">
                  {r.source === "feedback" ? "you" : "corpus"}
                </span>
                <button
                  onClick={() => remove(i)}
                  disabled={deletingIndex === i}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] -my-2 -mr-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  aria-label={`Remove rule "${r.rule}"`}
                >
                  <Trash weight="regular" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="refine-draft" className="text-sm font-bold">
            The draft that sounded off
          </label>
          <textarea
            id="refine-draft"
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            rows={4}
            placeholder="Paste the AI draft here..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-soft resize-y"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="refine-critique" className="text-sm font-bold">
            What&apos;s off about it?
          </label>
          <textarea
            id="refine-critique"
            value={critique}
            onChange={(e) => setCritique(e.target.value)}
            rows={2}
            placeholder='e.g. "I never write LMK in the middle of a sentence, only as a sign-off."'
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-soft resize-y"
          />
        </div>
        <div className="flex justify-end">
          <Button
            variant="secondary"
            className="min-h-[44px] gap-2"
            onClick={suggest}
            disabled={analyzing || !draftBody.trim() || !critique.trim()}
          >
            <Sparkle weight="regular" className="size-4" />
            {analyzing ? "Reading..." : "Suggest rules"}
          </Button>
        </div>
      </div>

      {proposed !== null && (
        <div className="space-y-2 border-t border-border pt-4">
          {proposed.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing new to add from this one. Your voice already covers it.
            </p>
          ) : (
            <>
              <h3 className="text-sm font-bold">Proposed rules</h3>
              <ul className="space-y-2 list-none p-0 m-0">
                {proposed.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <input
                      value={rule}
                      onChange={(e) => editProposed(i, e.target.value)}
                      aria-label={`Proposed rule ${i + 1}`}
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-soft"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="min-h-[44px] gap-1"
                      onClick={() => add(rule)}
                      disabled={busyRule === rule || !rule.trim()}
                    >
                      <Check weight="regular" className="size-4" />
                      Add
                    </Button>
                    <button
                      onClick={() => skip(i)}
                      className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`Skip proposed rule ${i + 1}`}
                    >
                      <X weight="regular" className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
